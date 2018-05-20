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

var { ObjectID } = require('mongodb');
var { Ticket } = require('./server/models/ticket');
var { Tecnico } = require('./server/models/tecnico');
var { Cliente } = require('./server/models/cliente');
var { Azienda } = require('./server/models/azienda');
var { Prio } = require('./server/models/prio');
var { Task } = require('./server/models/task');

var app = express();

var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

// hbs.registerPartials(__dirname + '/views/partials');
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

hbs.registerHelper('clientidb', () => {
    Cliente.find().select('nome cognome').then((clienti) => {
        console.log(clienti);

        return clienti;
    });
});

hbs.registerHelper('tecniciPortale', () => {
    Tecnico.find().then((tecnici) => {

    }).catch((error) => {

    });
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

            resp.redirect('/tickets');
        } else {

            var tecnico = new Tecnico(tecnicoFromHtml);

            tecnico.save().then(() => {
                return tecnico.generaTocken();
            }).then((token) => {
                req.session.xt = token;
                resp.redirect('/tickets');
            }).catch(() => {
                resp.status(400).send();
            });
        }
    });

});

app.get('/tickets', autenticato, (req, resp) => {
    console.log('/tickets', req.query);
    Ticket.find().populate('_idCliente', 'nome cognome').then((tickets) => {
        console.log(tickets);
        resp.render('tickets', { tickets });
    }, (errore) => {
        resp.status(400).send();
    });

});

app.get('/tickets/:actions/:property', autenticato, (req, resp) => {
    console.log('/tickets/:actions/:property', req.params, req.query);

    var sorter = {};

    sorter[req.params.property] = 1;

    if (req.params.actions === 'orderBy') {
        Ticket.find({}).sort(sorter).then((tickets) => {
            resp.render('tickets', { tickets });
        }).catch((error) => {
            console.log(error);

            resp.status(400).send();
        });
    }
});


app.get('/tickets/:id', autenticato, (req, resp) => {

    if (!ObjectID.isValid(req.params.id)) {
        return resp.status(404).send();
    }

    Ticket.findById(req.params.id).then((ticket) => {
        resp.render('ticket', { ticket });
    }).catch((errore) => {
        return resp.status(404).send();
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
        console.log(viewModel);
        resp.render('creaTicket', { viewModel });
    }).catch((error) => {
        console.log(error);
    });
});

app.post('/tickets', (req, resp) => {

    // console.log(req.body);

    var ticketBody = _.pick(req.body, ['titolo', '_idCliente', '_idTask', '_idPrio', '_idTecnico']);

    console.log(ticketBody);
    
    // resp.redirect('dashboard');

    var ticket = new Ticket(ticketBody);

    ticket.save().then((result) => {
        
        resp.render('tickets');
    }, (errore) => {
        console.log(errore);

        resp.status(400).send(errore);
    });
});

app.listen(process.env.PORT, () => {
    console.log('Server started at port 3000!');
});

