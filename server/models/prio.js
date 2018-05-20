var mongoose = require('mongoose');
var moment = require('moment');
const _ = require('lodash');

var PrioSchema = mongoose.Schema({
    nome: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
    }
});

var Prio = mongoose.model('Prio', PrioSchema);

module.exports = { Prio };