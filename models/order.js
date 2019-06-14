var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
const Transaction = require('mongoose-transactions')

const transaction = new Transaction()
mongoose.Promise = require('bluebird');
mongoose.connect('mongodb://localhost/nodeauth', { useNewUrlParser: true });

var db = mongoose.connection;


var OrderSchema = new mongoose.Schema({
    clientId: String, 
    bezahlt: Boolean,
    reservation: Date 
});

OrderSchema.plugin(uniqueValidator);

var Order = module.exports = mongoose.model('order99', OrderSchema);

module.exports.getOrderById = function (id, callback) {
    Eintritt.findById(id, callback);
}

module.exports.findWithPromise = function (id) {

    Order.findById(id).then(function (order) {
        console.log('here kommt der eintritt :' + order);
    }, function (err) {
        console.log('ist in promise error : ' + err);
    })

}
module.exports.getOrdersByClientId = function (clientId, callback) {
    
    Order.find().where("clientId", clientId).
        exec(function (err, orders) {
            callback(err, orders);
        });
}

module.exports.getOrdersByTicketId = function (ticketId, callback) {

    Orders.find().where("ticketId", ticketId).
        exec(function (err, orders) {
            callback(err, orders);
        });
}

module.exports.saveOrder = function (newOrder, callback) {
    newOrder.save(callback);
}