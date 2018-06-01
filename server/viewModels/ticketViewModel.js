const _ = require('lodash');

var { ObjectID } = require('mongodb');
var { Ticket } = require('../models/ticket');
var { Tecnico } = require('../models/tecnico');
var { Cliente } = require('../models/cliente');
var { Azienda } = require('../models/azienda');
var { Prio } = require('../models/prio');
var { Task } = require('../models/task');
var { Stato } = require('../models/stato');


class TicketViewModel {
    constructor() {

    }
    async creaSimpleTicketViewModel() {
        this.clientidb = await Cliente.find().populate('_idAzienda', 'nomeAzienda').select('nome cognome');
        this.tecnicidb = await Tecnico.find().select('nome cognome');
        this.priodb = await Prio.find();
        this.taskdb = await Task.find();
        this.statidb = await Stato.find();
    }
    async creaTicketViewModel(queryTicket, queryTecnico, queryClienti, queryTask, queryPrio, queryStato) {
        this.ticket = await queryTicket;
        this.clientidb = await queryClienti;
        this.tecnicidb = await queryTecnico;
        this.priodb = await queryPrio;
        this.taskdb = await queryTask;
        this.statidb = await queryStato;
    }
    async preparaSelected() {
        return new Promise((resolve, reject) => {
            if (_.findIndex(this.clientidb, { '_id': this.ticket._idCliente }) >= 0) {
                var cliente = this.clientidb[_.findIndex(this.clientidb, { '_id': this.ticket._idCliente })];
                cliente['selected'] = true;
                // console.log('cliente', cliente);
            }
            if (_.findIndex(this.taskdb, { '_id': this.ticket._idTask }) >= 0) {
                var task = this.taskdb[_.findIndex(this.taskdb, { '_id': this.ticket._idTask })];
                task['selected'] = true;
                // console.log('task', task);
            }
            if (_.findIndex(this.tecnicidb, { '_id': this.ticket._idTecnico }) >= 0) {
                var tecnico = this.tecnicidb[_.findIndex(this.tecnicidb, { '_id': this.ticket._idTecnico })];
                tecnico['selected'] = true;
                // console.log('tecnico', tecnico);
            }
            if (_.findIndex(this.priodb, { '_id': this.ticket._idPrio }) >= 0) {
                var prio = this.priodb[_.findIndex(this.priodb, { '_id': this.ticket._idPrio })];
                prio['selected'] = true;
                // console.log('prio', prio);
            }
            if (_.findIndex(this.statidb, { '_id': this.ticket._idStato }) >= 0) {
                var stato = this.statidb[_.findIndex(this.statidb, { '_id': this.ticket._idStato })];
                stato['selected'] = true;
                // console.log('stato', stato);
            }
            resolve(this);
        });
    }
}

module.exports = { TicketViewModel };