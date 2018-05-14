var mongoose = require('mongoose');
var moment = require('moment');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const bcrypt = require('bcryptjs');

var TecnicoSchema = mongoose.Schema({
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
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    email: {
        type: String,
        minlength: 1,
        required: true,
        trim: true,
        unique: true
    },
    tokens: [{
        access: {
            type: String,
            required: true
        },
        token: {
            type: String,
            required: true
        }
    }]
});

TecnicoSchema.statics.findByToken = function (token) {
    var Tecnico = this;
    var decoded;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return Promise.reject();
    }

    return Tecnico.findOne({
        _id: decoded._id
        // ,
        // 'tokens.token': token,
        // 'tokens.access': 'auth'
    });
};

TecnicoSchema.methods.generaTocken = function () {
    var tecnico = this;
    var access = 'auth';
    var token = jwt.sign({ _id: tecnico._id.toHexString(), access }, process.env.JWT_SECRET).toString();

    tecnico.tokens = tecnico.tokens.concat({ access, token });

    // return tecnico.save().then(() => {
    return token;
    // });
};

TecnicoSchema.pre('save', function (next) {
    var tecnico = this;

    if (tecnico.isModified('password')) {
        bcrypt.genSalt(5).then((salt) => {
            bcrypt.hash(tecnico.password, salt).then((hash) => {
                tecnico.password = hash;
                next();
            });
        }).catch((error) => {

        });
    } else {
        next();
    }
});

var Tecnico = mongoose.model('Tecnico', TecnicoSchema);



module.exports = { Tecnico };