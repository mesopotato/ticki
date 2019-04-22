var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

mongoose.connect('mongodb://localhost/nodeauth', { useNewUrlParser: true });

var db = mongoose.connection;

var TicketSchema = new mongoose.Schema({
    kategorie: String,
    gueltig_datum: Date,
    gueltig_time: String,
    tueroeffnung: String,
    anzahl: Number,
    biswann: Date,
    preis: Number,
    eventId : { type: String, required: true }
});

TicketSchema.plugin(uniqueValidator);

var Ticket = module.exports = mongoose.model('tickets', TicketSchema);

module.exports.getTicketById = function (id, callback) {
    Ticket.findById(id, callback);
}


module.exports.getTicketsByEventId = function (eventId, callback) {
    Ticket.find().where("eventId", eventId).
    exec(function(err, tickets) {
        callback(err, tickets);
    });
}
module.exports.saveTickets = function (newTicket, callback) {
        newTicket.save(callback);
}