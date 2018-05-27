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

var { ObjectID } = require('mongodb');
var { Ticket } = require('./server/models/ticket');
var { Tecnico } = require('./server/models/tecnico');
var { Cliente } = require('./server/models/cliente');
var { Azienda } = require('./server/models/azienda');
var { Prio } = require('./server/models/prio');
var { Task } = require('./server/models/task');
var { Stato } = require('./server/models/stato');

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
app.use(morgan('combined', { stream: accessLogStream }))


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

// hbs.registerHelper('tecniciPortale', () => {
//     return Tecnico.find().select('nome cognome').then((tecnici) => {
//         return tecnici;
//     }).catch((error) => {

//     });
// });

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
    resp.render('login');
});

app.get('/dashboard', autenticato, (req, resp) => {
    resp.render('dashboard');
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
        tecnici: [],
        tickets: [],
        tecnicoHref: req.tecnico._id
    };

    // console.log(viewModel);

    // console.log(req.tecnico);

    // console.log(req.query);

    if (req.query.hasOwnProperty('_idTecnico')) {
        if (req.query['_idTecnico'] != req.tecnico._id) {
            viewModel.tecnicoHref = req.query['_idTecnico'];
        }
    }

    var query = processQuery(req.query);

    return Ticket.find(query.filter).populate('_idCliente', 'nome cognome').populate('_idPrio', 'nome').populate('_idTecnico', 'nome cognome').sort(query.sort).then((tickets) => {
        viewModel.tickets = tickets;
        return viewModel;
    }).then((viewModel) => {
        return Tecnico.find({}).select('nome cognome').then((tecnici) => {
            viewModel.tecnici = tecnici;
            return viewModel;
        });
    }).then((viewModel) => {
        // console.log(viewModel);

        resp.render('tickets', { viewModel });
    }).catch((errore) => {
        resp.status(400).send();
    });
});

app.get('/tickets/:id', autenticato, (req, resp) => {
    var viewModel = {
        ticket: {}
    };

    if (!ObjectID.isValid(req.params.id)) {
        return resp.status(404).send();
    }

    return Ticket.findById(req.params.id).then((ticket) => {
        viewModel['ticket'] = ticket;
        return viewModel;
    }).then((viewModel) => {
        return Cliente.find().populate('_idAzienda', 'nomeAzienda').select('nome cognome').then((clienti) => {
            console.log(clienti);
            viewModel['clientidb'] = clienti;
            return viewModel;
        }).then((viewModel) => {
            return Tecnico.find().select('nome cognome').then((tecnici) => {
                viewModel['tecnicidb'] = tecnici;
                return viewModel;
            });
        }).then((viewModel) => {
            return Prio.find().then((prios) => {
                viewModel['priodb'] = prios;
                return viewModel;
            });
        }).then((viewModel) => {
            return Task.find().then((tasks) => {
                viewModel['taskdb'] = tasks;
                return viewModel;
            });
        }).then((viewModel) => {
            return Stato.find().then((stati) => {
                viewModel['statidb'] = stati;
                return viewModel;
            });
        });
    }).then((viewModel) => {
        console.log('************************* ticket ***************************');
        console.log(viewModel);
        console.log('************************************************************');
        resp.render('ticket', { viewModel });
    }).catch((error) => {
        console.log(error);
    });
});

app.get('/nuovoTicket', autenticato, (req, resp) => {
    var viewModel = {};
    return Cliente.find().populate('_idAzienda', 'nomeAzienda').select('nome cognome').then((clienti) => {
        console.log(clienti);
        viewModel['clientidb'] = clienti;
        return viewModel;
    }).then((viewModel) => {
        return Tecnico.find().select('nome cognome').then((tecnici) => {
            viewModel['tecnicidb'] = tecnici;
            return viewModel;
        });
    }).then((viewModel) => {
        return Prio.find().then((prios) => {
            viewModel['priodb'] = prios;
            return viewModel;
        });
    }).then((viewModel) => {
        return Task.find().then((tasks) => {
            viewModel['taskdb'] = tasks;
            return viewModel;
        });
    }).then((viewModel) => {
        return Stato.find().then((stati) => {
            viewModel['statidb'] = stati;
            return viewModel;
        });
    }).then((viewModel) => {
        console.log(viewModel);
        resp.render('creaTicket', { viewModel });
    }).catch((error) => {
        console.log(error);
    });
});

app.post('/tickets', autenticato, (req, resp) => {
    var ticketBody = _.pick(req.body, ['titolo', '_idCliente', '_idTask', '_idPrio', '_idTecnico']);
    var ticket = new Ticket(ticketBody);
    ticket.save().then((result) => {
        resp.render('tickets');
    }, (errore) => {
        resp.status(400).send(errore);
    });
});

app.post('/tickets/:id', autenticato, (req, resp) => {
    console.log(req.body);
    console.log(req.params);

    var eventoDb = {
        creatoDa: req.tecnico.nome + ' ' + req.tecnico.cognome,
        testo: req.body.nuovoEventoTicket
    };

    Ticket.findByIdAndUpdate({ _id: req.params.id }, { $push: { eventi: eventoDb } }).then((ticket) => {
        resp.render('ticket', { ticket });
    });
});

app.listen(process.env.PORT, () => {
    console.log('Server started at port 3000!');
});

