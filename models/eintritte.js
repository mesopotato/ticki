var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
const Transaction = require('mongoose-transactions')

const transaction = new Transaction()
mongoose.Promise = require('bluebird');
mongoose.connect('mongodb://localhost/nodeauth', { useNewUrlParser: true });

var db = mongoose.connection;


var EintrittSchema = new mongoose.Schema({
    email: { type: String, required: true },
    abgebucht: Boolean,
    ticketId: { type: String, required: true }
});

EintrittSchema.plugin(uniqueValidator);

var Eintritt = module.exports = mongoose.model('eintritt2', EintrittSchema);

module.exports.getEintrittById = function (id, callback) {
    Eintritt.findById(id, callback);
}

module.exports.findWithPromise = function (id) {

    Eintritt.findById(id).then(function (eintritt) {
        console.log('here kommt der eintritt :' + eintritt);
    }, function (err) {
        console.log('ist in promise error : ' + err);
    })

}

module.exports.getEintritteByTicketId = function (ticketId, callback) {

    Eintritt.find().where("ticketId", ticketId).
        exec(function (err, eintritte) {
            callback(err, eintritte);
        });
}

module.exports.saveEintritt = function (newEintritt, callback) {
    newEintritt.save(callback);
}