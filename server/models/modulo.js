var mongoose = require('mongoose');
var moment = require('moment');
const _ = require('lodash');

var ModuloSchema = mongoose.Schema({
    nome: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
    }
});

var Modulo = mongoose.model('Modulo', ModuloSchema);

module.exports = { Modulo };