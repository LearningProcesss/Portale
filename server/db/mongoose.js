const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI).then((connessione) => {
    // var admin = new mongoose.mongo.Admin(mongoose.connection.db);
    // admin.buildInfo(function (err, info) {
    //    console.log(info.version);
    // });

}, (errore) => {
    console.log(errore);

});

module.exports = { mongoose };