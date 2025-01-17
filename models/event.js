var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var Ticket = require('../models/tickets');
mongoose.connect('mongodb://localhost/nodeauth', { useNewUrlParser: true });

var db = mongoose.connection;

var EventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    veranstalter: String,
    von: String,
    bis: String,
    picUrl : String, 
    picId : String, 
    beschreibung : String,
    youtube: String,
    lokation: String,
    address: String,
    plz: String,
    userId : {type: String, required: true}
    ,bezahlt : Boolean
});

EventSchema.plugin(uniqueValidator);

var Event = module.exports = mongoose.model('events99', EventSchema);

module.exports.getEventById = function (id, callback) {
    Event.findById(id, callback);
}

module.exports.getEventByTitle = function (title, callback) {
    var query = { 'title': title };
    var queryStringify = { 'name': JSON.stringify(title) };
    console.log('getUserByUsername JSON : ' + JSON.stringify(title));
    console.log('getUserByUsername : ' + title);
    Event.findOne({ title: title }, callback);
}
module.exports.getEventByUser = function (user, callback) {
    //sort does not work yet :(
    Event.find().sort({id: 1}).where("userId", user.id).
    exec(function(err, events) {
        callback(err, events);
    });
}
module.exports.getEvents = function (callback) {
    //sort does not work yet :(
    Event.find().
    exec(function(err, events) {
        callback(err, events);
    });
}
module.exports.createEvent = function (newEvent, callback) {
        newEvent.save(callback);
}