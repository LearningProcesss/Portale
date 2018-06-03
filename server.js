require('./server/config/config');
var express = require('express');
var cookieSession = require('cookie-session')
const hbs = require('hbs');
const fs = require('fs');
const db = require('./server/db/mongoose');
const _ = require('lodash');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var path = require('path');
var diff = require('deep-diff').diff;
var moment = require('moment');


var { ObjectID } = require('mongodb');
var { mongoose } = require('./server/db/mongoose');
var { Ticket } = require('./server/models/ticket');
var { Tecnico } = require('./server/models/tecnico');
var { Cliente } = require('./server/models/cliente');
var { Azienda } = require('./server/models/azienda');
var { Prio } = require('./server/models/prio');
var { Task } = require('./server/models/task');
var { Stato } = require('./server/models/stato');

var { TicketViewModel } = require('./server/viewModels/ticketViewModel');

var app = express();

var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

hbs.registerPartials(__dirname + '/views/partials');
app.set('views', __dirname + '/views');
app.set('view engine', 'hbs');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2']
}));
app.use(morgan('combined', { stream: accessLogStream }));

// **********************************************************

hbs.registerHelper('formatMongoDate', (mongoDate) => {

    if (_.isUndefined(mongoDate)) {
        return '';
    }

    return moment(mongoDate).format('DD/MM/YYYY HH:mm:ss');
});

hbs.registerHelper('prioClass', (valorePrioTicket) => {
    switch (valorePrioTicket) {
        case 'Inbox':
            return 'default';
            break;
        case 'Non del tutto urgente':
            return 'success';
            break;
        case 'Urgente':
            return 'warning';
            break;
        case 'Tutti fermi':
            return 'danger';
            break;
        default:
            return 'default';
            break;
    }
});

hbs.registerHelper('ultimoEvento', (eventi) => {
    if (_.isArray(eventi) && _.size(eventi) > 0) {
        return _.last(eventi).testo;
    }

    return '';
});

hbs.registerHelper('ifCond', function (v1, operator, v2, options) {
    switch (operator) {
        case '==':
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
        default:
            return options.inverse(this);
    }
});

// **********************************************************

var autenticato = (req, resp, next) => {
    var x = req.session.xt;

    if (_.isUndefined(x)) {
        resp.redirect('login');
    }

    if (!_.isUndefined(x)) {
        Tecnico.findByToken(x).then((tecnico) => {
            if (!tecnico) {
                return Promise.reject();
            }

            req.tecnico = tecnico;
            req.token = x;

            next();
        }).catch((error) => {
            resp.redirect('login');
        });
    }
};

app.get('/', autenticato, (req, resp) => {
    resp.redirect('dashboard');
});

app.get('/signin', (req, resp) => {
    resp.render('signin');
});

app.get('/login', (req, resp) => {
    resp.render('login', { titolo: 'Rocket' });
});

app.get('/dashboard', autenticato, async (req, resp) => {
    var viewModel = new TicketViewModel();

    await viewModel.creaSimpleTicketViewModel();

    resp.render('dashboard', { viewModel });
});

app.post('/logout', (req, resp) => {
    req.session = null;
    resp.redirect('dashboard');
});

app.post('/loginOrSignin', (req, resp) => {

    var tecnicoFromHtml = _.pick(req.body, ['nome', 'cognome', 'password', 'email']);

    Tecnico.findOne({ email: tecnicoFromHtml.email }).then((tecnico) => {

        if (!_.isNull(tecnico)) {

            var token = tecnico.generaTocken();

            req.session.xt = token;

            resp.redirect(`/tickets?_idTecnico=${tecnico._id}`);

        } else {

            var tecnico = new Tecnico(tecnicoFromHtml);

            tecnico.save().then(() => {
                return tecnico.generaTocken();
            }).then((token) => {

                req.session.xt = token;

                resp.redirect(`/tickets?_idTecnico=${tecnico._id}`);
            }).catch(() => {
                resp.status(400).send();
            });
        }
    });

});

//Dalla funzione autenticato ottengo il tecnico.
//Se nella query il tecnico è diverso da quello che è in sessione, mando questa info attraverso il viewmodel, per comporre le query dinamicamente
app.get('/tickets', autenticato, async (req, resp) => {

    var tickets = await mongoose.model('Ticket').aggregate(
        [
            {
                $match: {
                    _idTecnico: ObjectID(req.query['_idTecnico'])
                }
            },
            {
                $lookup: {
                    from: "statos",
                    localField: "_idStato",
                    foreignField: "_id",
                    as: "priotik",
                }
            },
            {
                $match: {
                    'priotik.interno': 1
                }
            },
            { 
                $sort : 
                { 
                    creatoIl : -1
                } 
            }
        ]);

    var viewModel = new TicketViewModel(tickets, req.tecnico._id);

    if (req.query.hasOwnProperty('_idTecnico')) {
        if (req.query['_idTecnico'] != req.tecnico._id) {
            viewModel.tecnicoHref = req.query['_idTecnico'];
        }
    }

    await viewModel.creaSimpleTicketViewModel();

    console.log(viewModel);
    

    resp.render('tickets', { viewModel });
});

//visualizza un singolo ticket, dato un id
app.get('/tickets/:id', autenticato, async (req, resp) => {

    if (!ObjectID.isValid(req.params.id)) {
        return resp.status(404).send();
    }

    var viewModel = new TicketViewModel();

    await viewModel.creaTicketViewModel(
        Ticket.findById(req.params.id).lean(),
        // mongoose.model('Ticket').aggregate(
        //     [
        //         {
        //             $match: {
        //                 _id: ObjectID(req.params.id)
        //             }
        //         }
        //     ]),
        Tecnico.find().select('nome cognome').lean(),
        Cliente.find().populate('_idAzienda', 'nomeAzienda').select('nome cognome').lean(),
        Task.find().lean(),
        Prio.find().lean(),
        Stato.find().lean()
    );

    viewModel = await viewModel.preparaSelected();

    resp.render('ticket', { viewModel, indietro: req.headers['referer'] });
});

app.get('/nuovoTicket', autenticato, async (req, resp) => {
    var viewModel = new TicketViewModel();

    await viewModel.creaSimpleTicketViewModel();

    resp.render('creaTicket', { viewModel });
});

// creazione di un nuovo ticket
app.post('/tickets', autenticato, async (req, resp) => {

    var ticketBody = _.pick(req.body, ['titolo', '_idCliente', '_idTask', '_idPrio', '_idStato', '_idTecnico', 'nuovoEventoTicket']);

    if (!_.isNull(ticketBody.nuovoEventoTicket) && !_.isUndefined(ticketBody.nuovoEventoTicket)) {

        ticketBody['eventi'] = [{
            creatoIl: new Date(),
            creatoDa: req.tecnico.nome + ' ' + req.tecnico.cognome,
            testo: ticketBody.nuovoEventoTicket
        }];

        delete ticketBody.nuovoEventoTicket;
    }

    var ticket = new Ticket(ticketBody);

    var nuovoTicket = await ticket.save();

    if (nuovoTicket) {
        resp.redirect(`/tickets/${nuovoTicket._id}`);
    }
    else {
        resp.status(400).send(errore);
    }
});

// aggiorna un ticket
app.post('/tickets/:id', autenticato, async (req, resp) => {

    var attributiTicket = _.pick(req.body, ['_idCliente', '_idPrio', '_idStato', '_idTask']);

    var eventoDb = {
        creatoIl: new Date(),
        creatoDa: req.tecnico.nome + ' ' + req.tecnico.cognome,
        testo: req.body.nuovoEventoTicket
    };

    try {
        // var tickedbPre = await Ticket.findByIdAndUpdate({ _id: req.params.id });

        var ticketdb = await Ticket.findByIdAndUpdate(
            {
                _id: req.params.id
            },
            {
                $set: {
                    _idPrio: ObjectID(attributiTicket._idPrio),
                    _idStato: ObjectID(attributiTicket._idStato),
                    _idCliente: ObjectID(attributiTicket._idCliente),
                    _idTask: ObjectID(attributiTicket._idTask),
                    modificatoIl: new Date()
                },
                $push: {
                    eventi: eventoDb
                }
            }
        );

        // var resultDiffPost = diff(tickedbPre, ticketdb);

        // console.log(resultDiffPost);

        if (ticketdb) {
            resp.redirect(`/tickets/${req.params.id}`);
        }

    } catch (error) {
        resp.send(400);
    }
});

app.listen(process.env.PORT, () => {

    // Tecnico.find({}).select('nome cognome').lean().then((tecnici) => {
    //     storage.setItem('tecnici', tecnici).then(() => {

    //     });
    // });

    console.log('Server started at port 3000!');
});

