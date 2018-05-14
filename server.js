require('./server/config/config');
var express = require('express');
const hbs = require('hbs');
const fs = require('fs');
const db = require('./server/db/mongoose');
const _ = require('lodash');
var bodyParser = require('body-parser');

var { ObjectID } = require('mongodb');
var { Ticket } = require('./server/models/ticket');
var { Tecnico } = require('./server/models/tecnico');

var app = express();


// hbs.registerPartials(__dirname + '/views/partials');
app.set('views', __dirname + '/views');
app.set('view engine', 'hbs');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


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

var autenticato = (req, resp, next) => {
    console.log('start autenticato');

    var token = req.header('x-auth');

    console.log(token);


    if (_.isUndefined(token)) {
        next();
    }

    Tecnico.findByToken(token).then((tecnico) => {
        if (!tecnico) {
            return Promise.reject();
        }

        req.tecnico = tecnico;
        req.token = token;

        next();
    }).catch((error) => {
        // resp.status(401).send();
    });
};

app.get('/', (req, resp) => {
    resp.render('index');
});

app.get('/signin', (req, resp) => {
    resp.render('signin');
});

app.get('/login', autenticato, (req, resp) => {
    resp.render('login');
});

app.post('/loginOrSignin', (req, resp) => {

    var tecnicoFromHtml = _.pick(req.body, ['nome', 'cognome', 'password', 'email']);
    console.log('loginOrSignin', tecnicoFromHtml);

    Tecnico.findOne({ email: tecnicoFromHtml.email }).then((tecnico) => {
        console.log('loginOrSignin', tecnico);

        if (!_.isNull(tecnico)) {
            var token = tecnico.generaTocken();
            resp.header('x-auth', token).render('tickets');
        } else {
            var tecnico = new Tecnico(tecnicoFromHtml);

            tecnico.save().then(() => {
                return tecnico.generaTocken();
            }).then((token) => {
                resp.header('x-auth', token).render('tickets');
            }).catch(() => {
                resp.status(400).send();
            });
        }
    });

});

app.get('/tickets', autenticato, (req, resp) => {

    Ticket.find().then((tickets) => {
        resp.render('tickets.hbs', { tickets });
    }, (errore) => {
        resp.status(400).send();
    });

});

app.get('/tickets/:id', (req, resp) => {

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

