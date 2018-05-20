var mongoose = require('mongoose');
var moment = require('moment');
var { Stato } = require('./stato');
const _ = require('lodash');

var TicketSchema = mongoose.Schema({
    titolo: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
    },
    _idPrio: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prio'
    },
    _idTask: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    },
    _idCliente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cliente'
    },
    _idTecnico: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tecnico'
    },
    _idStato: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stato'
    },
    creatoIl: {
        type: Number
    },
    chiusoIl: {
        type: Number
    },
    ticketProcad: {
        type: Number
    },
    risoluzione: {
        type: String,
        trim: true
    },
    eventi: [{
        testo: {
            type: String,
            trim: true
        },
        creatoIl: {
            type: Number
        }
    }]
});

TicketSchema.pre('save', function (next) {

    var ticket = this;

    ticket.creatoIl = moment.now();

    if (_.isUndefined(ticket._idStato)) {
        ticket._idStato = 'Inbox';
    }

    next();
});

var Ticket = mongoose.model('Ticket', TicketSchema);



module.exports = { Ticket };