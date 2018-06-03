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
        type: Date
    },
    modificatoIl: {
        type: Date
    },
    chiusoIl: {
        type: Date
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
        creatoDa: {
            type: String,
            trim: true
        },
        creatoIl: {
            type: Date
        }
    }]
});

TicketSchema.pre('save', function (next) {

    var ticket = this;

    ticket.creatoIl = moment.now();

    if (_.isUndefined(ticket._idStato)) {
        Stato.findOne({ nome: 'Inbox' }).then((stato) => {
            console.log('********', stato);
            
            ticket._idStato = stato._id;

            console.log('**************', ticket);

            next();
            
        });
    }

    next();
});


var Ticket = mongoose.model('Ticket', TicketSchema);



module.exports = { Ticket };