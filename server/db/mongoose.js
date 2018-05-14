const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI).then((connessione) => {

}, (errore) => {
    console.log(errore);
    
});

module.exports = { mongoose };