var express = require('express');
var router = express.Router();
var multer = require('multer');
//handle file uploads
//var upload = multer({ dest: './uploads' });
var flash = require('connect-flash');
var passport = require('passport');
var expressValidator = require('express-validator');
var LocalStrategy = require('passport-local').Strategy;
var async = require("async");
var crypto = require('crypto');
var nodemailer = require('nodemailer');
//db model user which we made 
var User = require('../models/user');
var Client = require('../models/client');
var Event = require('../models/event');

const cloudinary = require("cloudinary");
const cloudinaryStorage = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: 'dzcxfnvyu',
  api_key: '771478566264235',
  api_secret: '9VxATR7G6tjNLkqmEDGE5rQUoV8'
});
const storage = cloudinaryStorage({
  cloudinary: cloudinary,
  folder: "demo",
  allowedFormats: ["jpg", "png"],
  transformation: [{ width: 80, height: 80, crop: "limit" }]
});
const parser = multer({ storage: storage });

//das vielleicht wieder raus
var bodyParser = require('body-parser');
//router.use(bodyParser.json()); // support json encoded bodies
//router.use(bodyParser.urlencoded({ extended: true }));

/* GET users listing. */
router.get('/logout', function (req, res) {
  req.logout();
  req.flash('success', 'Sie sind ausgeloggt');
  res.redirect('/');
  //res.send('respond with a resource');
});
router.use(flash());

/* GET users listing. */
router.get('/mainpage', ensureAuthenticated, function (req, res, next) {
  console.log('get mainpage');
  var e = Event.getEventByUser(req.user, function (err, events) {
    if (err) {
      console.log('err !!!!!!!!!!!!: ' + err);
    }
    console.log('events sind : ' + events);
    res.render('mainpage', {
      events: events
    });
  });
});

function ensureAuthenticated(req, res, next) {
  //passport function 
  if (req.isAuthenticated()) {
    console.log('req.isAuthenticated is TRUE')
        // console.log(this._passport)
        // console.log('userPropert : : : . . : : : : : : : ')

        // console.log(this._passport.instance._userPropert)
    return next();
  }
  res.redirect('/');
}

router.get('/index', function (req, res, next) {
  res.render('index');
});

// assign req.user to req.session.user OR req.session.client to distinguish the roles..
function isLoggedIn(req, res, next) {
  if (req.session.user !== undefined) {
    next();
  } else {
    res.redirect("/login");
  }
} 

router.post('/login', (req, res) =>
  passport.authenticate('local', {
    successRedirect: '/users/mainpage',
    failureFlash: 'Benutzername oder Passwort ist falsch :(',
    failureRedirect: '/'
  })
    (req, res)
);

passport.serializeUser(function (userObject, done) {
  // userObject could be a Model1 or a Model2... or Model3, Model4, etc.
  let userGroup = "user";
  let userPrototype =  Object.getPrototypeOf(userObject);

  if (userPrototype === User.prototype) {
    userGroup = "user";
  } else if (userPrototype === Client.prototype) {
    userGroup = "client";
  }

  let sessionConstructor = new SessionConstructor(userObject.id, userGroup, {name: userObject.name, email: userObject.email});
  done(null,sessionConstructor);
});

passport.deserializeUser(function (sessionConstructor, done) {

  if (sessionConstructor.userGroup == 'user') {
    User.getUserById(sessionConstructor.userId, function (err, user) {
      console.log('in serialize USER__________________________________________USER');
      done(err, user);
    });
  } else if (sessionConstructor.userGroup == 'client') {
    Client.getClientById(sessionConstructor.userId, function (err, user) {
      console.log('in serialize Client__________________________________________Client');
      done(err, user);
    });
  } 
});


passport.use(new LocalStrategy(
  function (name, password, done) {
    console.log('!user in Local Strategy');
    console.log('name ist : '+ name);
    console.log('password ist : ' + password);
    User.findOne({ $or: [{ 'email': name }, { 'name': name }] }, function (err, user) {
      if (err) { return done(err); }
      if (!user) {
        console.log('!user in Local user');
        return done(null, false, { message: 'Email oder Benutzername ungültig' });
      }
      User.comparePassword(password, user.password, function (err, isMatch) {
        if (err) return done(err);
        if (isMatch) {
          console.log('isMatch')
          return done(null, user);
        } else {
          console.log('!user in Local pwd');
          return done(null, false, { message: 'Passwort ungültig' });
        }
      });
    });
  }
));

router.post('/forgot', function (req, res, next) {
  async.waterfall([
    function (done) {
      crypto.randomBytes(20, function (err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function (token, done) {
      User.findOne({ email: req.body.email }, function (err, user) {
        if (!user) {
          //   console.log('error', 'No account with that email address exists.');
          req.flash('error', 'Es wurde kein Konto gefunden. Überprüfen Sie Ihre Eingaben');
          return res.redirect('/');
        }
        console.log('step 1')
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function (err) {
          done(err, token, user);
        });
      });
    },
    function (token, user, done) {
      console.log('step 2')


      var smtpTrans = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: 'dittrich.yannick@gmail.com',
          pass: 'Wh8sApp1993*/-'
        }
      });
      var mailOptions = {

        to: user.email,
        from: 'info@silvering.ch  ',
        subject: 'Password zurücksetzen für Ticki',
        text: 'Für Ihr Konto wurde eine ZUrücksetzung des Passworts angefragt\n\n' +
          'Klicken Sie auf folgenden Link um Ihr Passwort zu ändern:\n\n' +
          'http://' + req.headers.host + '/users/reset/' + token + '\n\n' +
          'Wenn Sie das Passwort nicht zurücksetzen wollen, können Sie diese Email ignorieren\n'

      };
      console.log('step 3')

      smtpTrans.sendMail(mailOptions, function (err) {
        if (err){
          console.log('send ist schiefgelaufen :' +err );
          req.flash('error', 'Da ist etwas schiefgelaufen ');
          res.redirect('/');
        }
        req.flash('success', 'Eine Email wurde an ' + user.email + ' gesendet');
        console.log('sent')
        res.redirect('/');
      });
    }
  ], function (err) {
    console.log('this err' + ' ' + err)
    res.redirect('/');
  });
});

router.get('/forgot', function (req, res) {
  res.render('forgot', {
    User: req.user
  });
});

/* GET users listing. */
router.post('/register', parser.single('image'), function (req, res, next) {

  console.log('POST///');

  var newusername = req.body.newusername;
  var email = req.body.newemail;
  var pwd = req.body.new_pwd;
  var pwd2 = req.body.new_pwd2;


  //form validation 
  req.checkBody('newusername', 'Geben Sie einen Benutzernamen an').notEmpty();
  req.checkBody('newemail', 'Geben Sie eine gültige E-Mail an').isEmail();
  // req.checkBody('new_pwd', 'Passwort ist zu kurz nehmen Sie mind 6 Zeichen...').isLength({ min: 6 });
  req.checkBody('new_pwd', 'Geben Sie ein Passwort an').notEmpty();
  req.checkBody('new_pwd2', 'Passwörter stimmen nicht überein').equals(req.body.new_pwd);

  //check Errors
  var errors = req.validationErrors();

  if (errors) {
    var y = false;
    var z = false;
    var a = false;
    var b = false;
    for (var i = 0; i < errors.length; i++) {
      console.log(errors[i]);
      if (errors[i].param === 'newusername') {
        console.log('if new username');
        newusername = errors[i].msg; a = true;
      }
      if (errors[i].param === 'newemail') {
        console.log('if new username');
        email = errors[i].msg; b = true;
      }
      if (errors[i].param === 'new_pwd') {
        console.log('if new username');
        pwd = errors[i].msg; y = true;
      }
      if (errors[i].param === 'new_pwd2') {
        console.log('if new username');
        pwd2 = errors[i].msg; z = true;
      }
    }
    res.render('register', {
      errors: errors,
      newusername: newusername,
      email: email,
      pwd: pwd,
      pwd2: pwd2,
      y: y,
      z: z,
      a: a,
      b: b
    })
  } else {
    if (req.file) {
      console.log('Uploading File...');
      console.log(req.file) // to see what is returned to you
      console.log('POST///reqfile');
      const image = {};
      image.url = req.file.url;
      image.id = req.file.public_id;
      var newUser = new User({
        name: newusername,
        email: email,
        password: pwd,
        imageId: image.id,
        imageUrl: image.url
      });
      // Image.create(image) // save image information in database
      //    .then(newImage => res.json(newImage))
      //    .catch(err => console.log(err));
    } else {
      console.log('No File Uploaded..');
      imageUrl = null;
      imageId = null;
      var newUser = new User({
        name: newusername,
        email: email,
        password: pwd,
        imageId: imageId,
        imageUrl: imageUrl
      });
    }

    //geht dnicht wenn kein bild!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    User.createUser(newUser, function (err, user) {
      if (err) {
        if (err.errors.name) {
          req.flash('error', 'Der Benutzername existiert bereits');
        } else if (err.errors.email) {
          req.flash('error', 'Mit dieser Email wurde bereits ein Konto registriert, loggen Sie sich mit dieser Email ein oder setzen Sie das Psswort zurück');
        } else {
          req.flash('error', 'es ist etwas schiefgelaufen, warten Sie einen Moment und probieren Sie es erneut');
        }
        res.location('/');
        res.redirect('/');
      } else {
        console.log('POST///uaser created');

        //user.imageId = image.id;
        //user.imageUrl = image.url;
        console.log('image :' + user.imageId);
        console.log('image :' + user.imageUrl);

        user.save(function (err) {
          if (err) {
            console.log('usr not saved ')
            return res.redirect('back');
          } else {
            console.log('saved also einloggen')
            req.logIn(user, function (err) {
              //done(err, user);
              if (err) { return next(err); }
              req.flash('success', 'Erfolgreich registriert');
              return res.redirect('/users/mainpage')
            });

            //res.location('/users/mainpage');
            //res.redirect('/users/mainpage');
          }
        });

      }
    });
  }

  console.log(req.body)
  console.log(req.file);


  //  req.body.email
});

router.get('/reset/:token', function (req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function (err, user) {
    console.log(user);
    if (!user) {
      req.flash('error', 'Passwort reset token ist ungültig oder ist abgelaufen. Fordern Sie erneut eine Email an');
      return res.redirect('/');
    }
    var y = false;
    var z = false;
    pwd = 'Geben Sie ein Passwort ein';
    pwd2 = 'Bestätigen Sie das Passwort';
    res.render('reset', {
      User: req.user,
      token: req.params.token,
      pwd: pwd,
      pwd2: pwd2,
      y: y,
      z: z
    });
  });
});

router.post('/reset/:token', function (req, res) {
  console.log('post kommt an');
  req.checkBody('new_pwd', 'Geben Sie ein Passwort an').notEmpty();
  req.checkBody('new_pwd', 'Passwort ist zu kurz nehmen Sie mind 6 Zeichen...').isLength({ min: 6 });
  req.checkBody('new_pwd2', 'Passwörter stimmen nicht überein').equals(req.body.new_pwd);

  //check Errors
  var errors = req.validationErrors();

  if (errors) {
    var y = false;
    var z = false;
    for (var i = 0; i < errors.length; i++) {
      switch (errors[i].param) {
        case 'new_pwd': pwd = errors[i].msg; y = true;
        case 'new_pwd2': pwd2 = errors[i].msg; z = true;
      }
    }
    res.render('reset', {
      token: req.params.token,
      pwd: pwd,
      pwd2: pwd2,
      y: y,
      z: z
    })
  } else {

    async.waterfall([
      function (done) {
        User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function (err, user, next) {
          if (!user) {
            console.log('no user ')
            req.flash('error', 'Passwort reset token ist ungültig oder ist abgelaufen. Fordern Sie erneut eine Email an');
            return res.redirect('back');
          }
          user.password = req.body.new_pwd;
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;
          console.log('passwort' + user.password + 'and the user is' + user)

          user.save(function (err) {
            if (err) {
              console.log('usr not saved ')
              return res.redirect('back');
            } else {
              console.log('saved also einloggen')
              req.logIn(user, function (err) {
                done(err, user);
              });

            }
          });
        });
      },

      function (user, done) {
        // console.log('got this far 4')
        var smtpTrans = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            user: 'dittrich.yannick@gmail.com',
            pass: 'Wh8sApp1993*/-'
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'info@silvering.ch',
          subject: 'Ihr Passwort wurde geändert',
          text: 'Guten Tag,\n\n' +
            ' - Dies ist eine Bestätigung, dass Ihr Passwort für das Konto' + user.email + ' gerade geändert wurde.\n'
        };
        smtpTrans.sendMail(mailOptions, function (err) {
          // req.flash('success', 'Success! Your password has been changed.');
          console.log('sent confirmation');
          done(err);
        });
      }
    ], function (err) {
      req.flash('success', 'Ihr Passwort wurde erfolgreich zurückgesetzt :)');
      res.redirect('/');
    });
  }
});

function SessionConstructor(userId, userGroup, details) {
  this.userId = userId;
  this.userGroup = userGroup;
  this.details = details;
}

module.exports = router;
