var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');
var uniqueValidator = require('mongoose-unique-validator');

mongoose.connect('mongodb://localhost/nodeauth', { useNewUrlParser: true });

var db = mongoose.connection;

var ClientSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    password: String,
    //datapoint:  String,
    email: { type: String, required: true, unique: true },
    resetPasswordToken: String,
    resetPasswordExpires: Date
});

ClientSchema.pre('save', function (next) {
    var client = this;
    var SALT_FACTOR = 10;

    if (!client.isModified('password')) return next();

    bcrypt.genSalt(SALT_FACTOR, function (err, salt) {
        if (err) return next(err);

        bcrypt.hash(client.password, salt, function (err, hash) {
            if (err) return next(err);
            client.password = hash;
            console.log('ich hasche in der fremden');
            next();
        });
    });
});

ClientSchema.plugin(uniqueValidator);

var Client = module.exports = mongoose.model('client99', ClientSchema);

module.exports.getClientById = function (id, callback) {
    Client.findById(id, callback);
}

module.exports.getClientByUsername = function (name, callback) {
    var query = { 'name': name };
    var queryStringify = { 'name': JSON.stringify(name) };
    console.log('getUserByUsername JSON : ' + JSON.stringify(name));
    console.log('getUserByUsername : ' + name);
    Client.findOne({ name: name }, callback);
}

module.exports.comparePassword = function (candidatePassword, hash, callback) {
    console.log('candiatate Password : ' + candidatePassword);
    console.log(' hash : ' + hash);
    bcrypt.compare(candidatePassword, hash, function (err, isMatch) {
        console.log('IsMAthc :' + isMatch);
        callback(null, isMatch);
    });
}

module.exports.createClient = function (newClient, callback) {
        console.log('saving user');
        newClient.save(callback);
}