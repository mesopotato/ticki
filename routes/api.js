var express = require('express');
var router = express.Router();
var multer = require('multer');
var flash = require('connect-flash');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var async = require("async");
var Infos = require('../models/appNpayment');

var Event = require('../models/event');

//example
app.get('/login/:name&:password', function(request, response) {
    const name = request.params.name 
    const password = request.params.password 

    Info.findOne( { 'appLoginUser': name }, function (err, user) {
        if (err) { return done(err); }
        if (!user) {
          console.log('!user in Local user');
          response.send({
              user: 'NO'
          })
        }
        Info.comparePassword(password, user.appLoginPwd, function (err, isMatch) {
          if (err) return done(err);
          if (isMatch) {

            //token generienen , abspeichern und zurücksenden.. 

            response.send({
                token: 'token'
            })
            
          } else {
            console.log('!user in Local pwd');
            response.send({
                user: 'MISMATCH'
            })
          }
        });
      });

 });

router.post('/login', (req, res) =>
  passport.authenticate('local', {
    successRedirect: 'https://auth.expo.io/@mesopotato/tickiApp',
    failureFlash: 'Benutzername oder Passwort ist falsch :(',
    failureRedirect: 'https://auth.expo.io/@mesopotato/tickiApps'
  })
    (req, res)
);

function ensureAuthenticated(req, res, next) {
    //hier eigene db abfrage
    if (req.isAuthenticated()) {
      return next();
    }
    //was wenn nicht mehr authenticated??
    res.redirect('/');
  }

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  Info.getAppNpayById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy(
  function (name, password, done) {
    console.log('!user in Local Strategy');
    Info.findOne( { 'appLoginUser': name }, function (err, user) {
      if (err) { return done(err); }
      if (!user) {
        console.log('!user in Local user');
        return done(null, false, { message: 'Email oder Benutzername ungültig' });
      }
      Info.comparePassword(password, user.appLoginPwd, function (err, isMatch) {
        if (err) return done(err);
        if (isMatch) {
          return done(null, user);
        } else {
          console.log('!user in Local pwd');
          return done(null, false, { message: 'Passwort ungültig' });
        }
      });
    });
  }
));


router.get('/getEvents',ensureAuthenticated, function (req, res) {
    Event.getEvents(function (err, events) {
        if (err) {
            console.log('err !!!!!!!!!!!!: ' + err);
        }
        console.log('events sind : ' + events);
        res.send( {
            events: events
        });
    });
 
});

router.get('/logout', function (req, res) {
    req.logout();
    req.flash('success', 'Sie sind ausgeloggt');
    res.redirect('/');
    //res.send('respond with a resource');
  });




module.exports = router;