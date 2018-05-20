var mongoose = require('mongoose');
var moment = require('moment');
const _ = require('lodash');

var TaskSchema = mongoose.Schema({
    nome: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
    }
});

var Task = mongoose.model('Task', TaskSchema);

module.exports = { Task };