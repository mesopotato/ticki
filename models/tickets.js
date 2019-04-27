var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

mongoose.connect('mongodb://localhost/nodeauth', { useNewUrlParser: true });

var db = mongoose.connection;

var TicketSchema = new mongoose.Schema({
    kategorie: String,
    gueltig_datum: String,
    // gueltig_bis: Date,
    gueltig_time: String,
    tueroeffnung: String,
    anzahl: Number,
    biswann: String,
    preis: Number,
    verkauft: Number,
    eventId: { type: String, required: true }
});

TicketSchema.plugin(uniqueValidator);

var Ticket = module.exports = mongoose.model('ticketsT2', TicketSchema);

module.exports.getTicketById = function (id, callback) {
    Ticket.findById(id, callback);
}



module.exports.getTicketsByEventId = function (eventId, callback) {
    Ticket.find().where("eventId", eventId).
        exec(function (err, tickets) {
            callback(err, tickets);
        });
}
module.exports.saveTickets = function (newTicket, callback) {
    newTicket.save(callback);
}

module.exports.order = function (ticketID, uebrig, callback) {
    console.log('in find and uPDATE');
    console.log('ticketID ist : '+ ticketID);
    console.log('uebrig ist : ' + uebrig);

        Ticket.findOneAndUpdate(
            {id: ticketID}, 
            {$inc:{verkauft:uebrig}}, {new: true}, (err, doc) => {
                if (err) {
                    console.log("Something wrong when updating data!");
                    
                }
                console.log("sucess !!!! updating data!");
                console.log(doc);
                callback(doc);
                
            });
}