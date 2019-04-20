var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

mongoose.connect('mongodb://localhost/nodeauth', { useNewUrlParser: true });

var db = mongoose.connection;

var PaymentSchema = new mongoose.Schema({
    app : Boolean, 
    payment : Boolean, 
    appLoginUser: String, 
    appLoginPwd : String,  
    eventId : { type: String, required: true }
});

PaymentSchema.plugin(uniqueValidator);

var appNpay = module.exports = mongoose.model('appNpayments', PaymentSchema);

module.exports.getAppNpayById = function (id, callback) {
    appNpay.findById(id, callback);
}

module.exports.getAppNpayByEventId = function (eventId, callback) {
    appNpay.find().where("eventId", eventId).
    exec(function(err, payNlogin) {
        callback(err, payNlogin);
    });
}
module.exports.saveAppNpayment = function (newLogin, callback) {
        newLogin.save(callback);
}