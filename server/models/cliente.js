var mongoose = require('mongoose');
var moment = require('moment');
const _ = require('lodash');

var ClienteSchema = mongoose.Schema({
    registartoIl: {
        type: Number
    },
    nome: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
    },
    cognome: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
    },
    _idAzienda: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Azienda'
    }
});

var Cliente = mongoose.model('Cliente', ClienteSchema);

module.exports = { Cliente };