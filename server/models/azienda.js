var mongoose = require('mongoose');
var moment = require('moment');
const _ = require('lodash');

var AziendaSchema = mongoose.Schema({
    nomeAzienda: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
    }
});

var Azienda = mongoose.model('Azienda', AziendaSchema);

module.exports = { Azienda };