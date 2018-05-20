var mongoose = require('mongoose');
var moment = require('moment');
const _ = require('lodash');

var StatoSchema = mongoose.Schema({
    nome: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
    }
});

var Stato = mongoose.model('Stato', StatoSchema);

module.exports = { Stato };