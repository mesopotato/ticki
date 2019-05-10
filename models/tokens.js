var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

mongoose.connect('mongodb://localhost/nodeauth', { useNewUrlParser: true });

var db = mongoose.connection;

var TokenSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    eventId : { type: String, required: true }
});

TokenSchema.plugin(uniqueValidator);

var Token = module.exports = mongoose.model('tokens', TokenSchema);

module.exports.getTokenById = function (id, callback) {
    Token.findById(id, callback);
}

module.exports.getToken = function (token, callback) {
    Token.find().where("token", token).
    exec(function (err, token) {
        callback(err, token);
    });
}

module.exports.getTokensByEventId = function (eventId, callback) {
    Token.find().where("eventId", eventId).
    exec(function (err, tokens) {
        callback(err, tokens);
    });
}

module.exports.saveToken = function (newToken, callback) {
        newToken.save(callback);
}
