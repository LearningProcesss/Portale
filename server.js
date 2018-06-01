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
const mongoQS = require('mongo-querystring');
const qs = require('query-params-mongo');
const storage = require('node-persist');

var { ObjectID } = require('mongodb');
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

// var qs = new mongoQS({});
var processQuery = qs({
    autoDetect: [
        {
            fieldPattern: /_id$/,
            dataType: 'objectId'
        }
    ],
    converters: { objectId: ObjectID }
});

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

storage.init({
    dir: __dirname + '/server/persistent',

    stringify: JSON.stringify,

    parse: JSON.parse,

    encoding: 'utf8'
}).then((ok) => {

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

app.get('/test', (req, resp) => {
    resp.render('test');
});

app.get('/', (req, resp) => {
    resp.render('dashboard');
});

app.get('/signin', (req, resp) => {
    resp.render('signin');
});

app.get('/login', (req, resp) => {
    resp.render('login', { titolo: 'Rocket' });
});

app.get('/dashboard', autenticato, async (req, resp) => {
    var viewModel = {
        tecnicidb: []
    };

    let i = await storage.getItem('tecnici');

    storage.getItem('tecnici').then((result) => {
        viewModel.tecnicidb = result;
    });
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
app.get('/tickets', autenticato, (req, resp) => {
    var viewModel = {
        tecnicidb: [],
        tickets: [],
        tecnicoHref: req.tecnico._id
    };

    if (req.query.hasOwnProperty('_idTecnico')) {
        if (req.query['_idTecnico'] != req.tecnico._id) {
            viewModel.tecnicoHref = req.query['_idTecnico'];
        }
    }

    storage.getItem('tecnici').then((result) => {
        viewModel.tecnicidb = result;
    });

    //var query = processQuery(req.query);

    Ticket.aggregate([{
        $lookup: {
            from: "prios",
            localField: "_idPrio",
            foreignField: "_id",
            as: "priotik"
        }
    },
    {
        $project: {
            nome: 1,
            priotik: {
                $filter: {
                    input: '$priotik',
                    as: 'prio',
                    cond: { $eq: ["$$prio.interno", 1] }
                }
            }
        }
    }
    ]).then((tickets) => {
        viewModel.tickets = tickets;

        resp.render('tickets', { viewModel });
    });

    // return Ticket.find(query.filter)
    //     .populate('_idCliente', 'nome cognome')
    //     .populate('_idPrio', 'nome')
    //     .populate('_idTecnico', 'nome cognome')
    //     .sort(query.sort).then((tickets) => {
    //         viewModel.tickets = tickets;
    //         return viewModel;
    //     }).then((viewModel) => {
    //         return Tecnico.find({}).select('nome cognome').then((tecnici) => {
    //             viewModel.tecnicidb = tecnici;
    //             return viewModel;
    //         });
    //     }).then((viewModel) => {
    //         resp.render('tickets', { viewModel });
    //     }).catch((errore) => {
    //         resp.status(400).send();
    //     });
});

app.get('/tickets/:id', autenticato, async (req, resp) => {

    if (!ObjectID.isValid(req.params.id)) {
        return resp.status(404).send();
    }

    var viewModel = new TicketViewModel();

    await viewModel.creaTicketViewModel(Ticket.findById(req.params.id),
        Tecnico.find().select('nome cognome').lean(),
        Cliente.find().populate('_idAzienda', 'nomeAzienda').select('nome cognome').lean(),
        Task.find().lean(),
        Prio.find().lean(),
        Stato.find().lean()
    );

    viewModel = await viewModel.preparaSelected();

    // var viewModel = {
    //     ticket: await Tecnico.find().select('nome cognome').lean(),
    //     tecnicidb: await Tecnico.find().select('nome cognome').lean(),
    //     clientidb: await Cliente.find().populate('_idAzienda', 'nomeAzienda').select('nome cognome').lean(),
    //     statidb: await Stato.find().lean(),
    //     taskdb: await Task.find().lean(),
    //     priodb: await Prio.find().lean()
    // };



    resp.render('ticket', { viewModel });

    // return Ticket.findById(req.params.id).then((ticket) => {
    //     viewModel['ticket'] = ticket;
    //     return viewModel;
    // }).then((viewModel) => {
    //     return Cliente.find().populate('_idAzienda', 'nomeAzienda').select('nome cognome').lean().then((clienti) => {
    //         viewModel['clientidb'] = clienti;
    //         return viewModel;
    //     }).then((viewModel) => {
    //         return Tecnico.find().select('nome cognome').lean().then((tecnici) => {
    //             viewModel['tecnicidb'] = tecnici;
    //             return viewModel;
    //         });
    //     }).then((viewModel) => {
    //         return Prio.find().lean().then((prios) => {
    //             viewModel['priodb'] = prios;
    //             return viewModel;
    //         });
    //     }).then((viewModel) => {
    //         return Task.find().lean().then((tasks) => {
    //             viewModel['taskdb'] = tasks;
    //             return viewModel;
    //         });
    //     }).then((viewModel) => {
    //         return Stato.find().lean().then((stati) => {
    //             viewModel['statidb'] = stati;
    //             return viewModel;
    //         });
    //     });
    // }).then((viewModel) => {
    //     // console.log('************************* ticket ***************************');
    //     if (_.findIndex(viewModel.clientidb, { '_id': viewModel.ticket._idCliente }) >= 0) {
    //         var cliente = viewModel.clientidb[_.findIndex(viewModel.clientidb, { '_id': viewModel.ticket._idCliente })];
    //         cliente['selected'] = true;
    //         // console.log('cliente', cliente);
    //     }
    //     if (_.findIndex(viewModel.taskdb, { '_id': viewModel.ticket._idTask }) >= 0) {
    //         var task = viewModel.taskdb[_.findIndex(viewModel.taskdb, { '_id': viewModel.ticket._idTask })];
    //         task['selected'] = true;
    //         // console.log('task', task);
    //     }
    //     if (_.findIndex(viewModel.tecnicidb, { '_id': viewModel.ticket._idTecnico }) >= 0) {
    //         var tecnico = viewModel.tecnicidb[_.findIndex(viewModel.tecnicidb, { '_id': viewModel.ticket._idTecnico })];
    //         tecnico['selected'] = true;
    //         // console.log('tecnico', tecnico);
    //     }
    //     if (_.findIndex(viewModel.priodb, { '_id': viewModel.ticket._idPrio }) >= 0) {
    //         var prio = viewModel.priodb[_.findIndex(viewModel.priodb, { '_id': viewModel.ticket._idPrio })];
    //         prio['selected'] = true;
    //         // console.log('prio', prio);
    //     }
    //     if (_.findIndex(viewModel.statidb, { '_id': viewModel.ticket._idStato }) >= 0) {
    //         var stato = viewModel.statidb[_.findIndex(viewModel.statidb, { '_id': viewModel.ticket._idStato })];
    //         stato['selected'] = true;
    //         // console.log('stato', stato);
    //     }
    //     // console.log(viewModel);
    //     // console.log('************************************************************');
    //     resp.render('ticket', { viewModel });
    // }).catch((error) => {
    //     console.log(error);
    // });
});

app.get('/nuovoTicket', autenticato, async (req, resp) => {
    var viewModel = new TicketViewModel();

    await viewModel.creaSimpleTicketViewModel();

    resp.render('creaTicket', { viewModel });
    // var viewModel = {
    //     tecnicidb: [],
    //     clientidb: [],
    //     priodb: [],
    //     taskdb: []
    // };

    // storage.getItem('tecnici').then((result) => {
    //     viewModel.tecnicidb = result;
    // });



    // return Cliente.find().populate('_idAzienda', 'nomeAzienda').select('nome cognome').then((clienti) => {
    //     viewModel['clientidb'] = clienti;
    //     return viewModel;
    // })
    //     // .then((viewModel) => {
    //     //     return Tecnico.find().select('nome cognome').then((tecnici) => {
    //     //         viewModel['tecnicidb'] = tecnici;
    //     //         return viewModel;
    //     //     });
    //     // })
    //     .then((viewModel) => {
    //         return Prio.find().then((prios) => {
    //             viewModel['priodb'] = prios;
    //             return viewModel;
    //         });
    //     }).then((viewModel) => {
    //         return Task.find().then((tasks) => {
    //             viewModel['taskdb'] = tasks;
    //             return viewModel;
    //         });
    //     }).then((viewModel) => {
    //         return Stato.find().then((stati) => {
    //             viewModel['statidb'] = stati;
    //             return viewModel;
    //         });
    //     }).then((viewModel) => {
    //         // console.log(viewModel);
    //         resp.render('creaTicket', { viewModel });
    //     }).catch((error) => {
    //         console.log(error);
    //     });
});

app.post('/tickets', autenticato, async (req, resp) => {

    var ticketBody = _.pick(req.body, ['titolo', '_idCliente', '_idTask', '_idPrio', '_idStato', '_idTecnico']);

    var ticket = new Ticket(ticketBody);

    var nuovoTicket = await ticket.save();

    if (nuovoTicket) {
        //resp.redirect(`/tickets?_idTecnico=${req.tecnico._id}`);

        resp.redirect(`/tickets/${nuovoTicket._id}`);
    }
    else {
        resp.status(400).send(errore);
    }

    // ticket.save().then((result) => {

    // }, (errore) => {
    //     resp.status(400).send(errore);
    // });
});

app.post('/tickets/:id', autenticato, (req, resp) => {

    var attributiTicket = _.pick(req.body, ['_idCliente', '_idPrio', '_idStato', '_idTask']);
    
    Object.keys(attributiTicket).forEach(function (key, index) {

        attributiTicket[key] = ObjectID(attributiTicket[key]);
    });

    var eventoDb = {
        creatoDa: req.tecnico.nome + ' ' + req.tecnico.cognome,
        testo: req.body.nuovoEventoTicket
    };

    Ticket.findByIdAndUpdate({ _id: req.params.id }, { $set: { attributiTicket }, $push: { eventi: eventoDb } }).then((ticket) => {
        //console.log(ticket);

        //resp.render('ticket', { ticket });
    });
});

app.listen(process.env.PORT, () => {

    // Tecnico.find({}).select('nome cognome').lean().then((tecnici) => {
    //     storage.setItem('tecnici', tecnici).then(() => {

    //     });
    // });

    console.log('Server started at port 3000!');
});

