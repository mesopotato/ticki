var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');
var uniqueValidator = require('mongoose-unique-validator');

mongoose.connect('mongodb://localhost/nodeauth', { useNewUrlParser: true });

var db = mongoose.connection;

/*user schema
var UserSchema = mongoose.Schema({
    name: {
        type: String,
        index: true
    },
    email: {
        type: String
    },
    password: {
        type: String
    }
}); 

*/
var UserSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    password: String,
    //datapoint:  String,
    email: { type: String, required: true, unique: true },
    imageId : String,
    imageUrl : String,
    resetPasswordToken: String,
    resetPasswordExpires: Date
});


UserSchema.pre('save', function (next) {
    var user = this;
    var SALT_FACTOR = 10;

    if (!user.isModified('password')) return next();

    bcrypt.genSalt(SALT_FACTOR, function (err, salt) {
        if (err) return next(err);

        bcrypt.hash(user.password, salt, function (err, hash) {
            if (err) return next(err);
            user.password = hash;
            console.log('ich hasche in der fremden');
            next();
        });
    });
});

UserSchema.plugin(uniqueValidator);

var User = module.exports = mongoose.model('users', UserSchema);

module.exports.getUserById = function (id, callback) {
    User.findById(id, callback);
}

module.exports.getUserByUsername = function (name, callback) {
    var query = { 'name': name };
    var queryStringify = { 'name': JSON.stringify(name) };
    console.log('getUserByUsername JSON : ' + JSON.stringify(name));
    console.log('getUserByUsername : ' + name);
    User.findOne({ name: name }, callback);
}

module.exports.comparePassword = function (candidatePassword, hash, callback) {
    console.log('candiatate Password : ' + candidatePassword);
    console.log(' hash : ' + hash);
    bcrypt.compare(candidatePassword, hash, function (err, isMatch) {
        console.log('IsMAthc :' + isMatch);
        callback(null, isMatch);
    });
}
module.exports.createUser = function (newUser, callback) {

        console.log('ich hasche in der eigenen');
        /*bcrypt.hash(newUser.password, salt, function (err, hash) {
            newUser.password = hash;
            newUser.save(callback);
        });*/
        newUser.save(callback);
}