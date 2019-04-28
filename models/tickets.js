var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
const Transaction = require('mongoose-transactions')
 
const transaction = new Transaction()

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
/*
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
*/
            async function start () {
                try {
                   // const jonathanId = transaction.insert(person, jonathanObject)
                    transaction.update('ticketsT2', ticketID, {verkauft : uebrig});
                    console.log('im TRYHARDE');
                    //transaction.remove(person, 'fakeId') // this operation fail
                    const final = await transaction.run();

                    // expect(final[0].name).toBe('Jonathan')
                } catch (error) {
                    console.error(error)
                    console.log('HAAHA');
                    const rollbackObj = await transaction.rollback().catch(console.error)
                    transaction.clean()
                    console.log('cleanded')
                    //  expect(rollbacks[0].name).toBe('Alice')
                    //  expect(rollbacks[0].age).toBe(aliceObject.age)
                    //  expect(rollbacks[1].name).toBe('Jonathan')
                    //  expect(rollbacks[1].age).toBe(bobObject.age)    
                }
            }
             
            start()
}