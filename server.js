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

hbs.registerHelper('tecniciPortale', () => {
    Tecnico.find().then((tecnici) => {

    }).catch((error) => {

    });
});

var autenticato = (req, resp, next) => {
    console.log('********************** start autenticato ************************');

    var x = req.session.xt;

    console.log(x);

    // var token = req.header('x-auth');

    // console.log(token);


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

    console.log('********************** end autenticato ************************');
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

app.get('/dashboard', (req, resp) => {
    resp.render('dashboard');
});

app.post('/logout', (req, resp) => {
    req.session = null;
    resp.redirect('dashboard');
});

app.post('/loginOrSignin', (req, resp) => {

    var tecnicoFromHtml = _.pick(req.body, ['nome', 'cognome', 'password', 'email']);

    console.log('loginOrSignin tecnicologin', tecnicoFromHtml);

    Tecnico.findOne({ email: tecnicoFromHtml.email }).then((tecnico) => {
        console.log('loginOrSignin', tecnico);

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

    Ticket.find().then((tickets) => {
        resp.render('tickets', { tickets });
    }, (errore) => {
        resp.status(400).send();
    });

});

app.get('/tickets/:id', autenticato, (req, resp) => {

    if (!ObjectID.isValid(req.params.id)) {
        return resp.status(404).send();
    }

    Ticket.findById(req.params.id).then((ticket) => {
        resp.render('ticket.hbs', { ticket });
    }).catch((errore) => {
        return resp.status(404).send();
    });
});

app.post('/tickets', (req, resp) => {

    var ticket = new Ticket({
        titolo: req.body.titolo,
        prio: req.body.prio,
        tipo: req.body.tipo,
        _idCliente: 1
    });

    ticket.save().then((result) => {
        console.log(result);
        resp.status(200).send(ticket);
    }, (errore) => {
        console.log(errore);

        resp.status(400).send(errore);
    });
});

app.listen(process.env.PORT, () => {
    console.log('Server started at port 3000!');
});

