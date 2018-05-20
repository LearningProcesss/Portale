var { Ticket } = require('./server/models/ticket');
var mongoose = require('mongoose');
const _ = require('lodash');

_.mixin({ pickSchema: function (model, excluded) {
    var fields = [];
    model.schema.eachPath(function (path) {
      _.isArray(excluded) ? excluded.indexOf(path) < 0 ? fields.push(path) : false : path === excluded ? false : fields.push(path);
    });
    return fields;
  }
});

//console.log(_.pickSchema(Ticket));

Ticket.schema.eachPath((path) => {
    var t = Ticket.schema.path(path);
  var tt = _.pick(t, ['path', 'instance']);
    console.log(tt);
});


