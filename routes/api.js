var express = require('express');
var router = express.Router();
var multer = require('multer');
var flash = require('connect-flash');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var async = require("async");
var Info = require('../models/appNpayment');
var crypto = require('crypto');
var Event = require('../models/event');
var Ticket = require('../models/tickets');
var Token = require('../models/tokens');

//example
router.get('/login/:name&:password', function (request, response) {
    const name = request.params.name
    const password = request.params.password

    Info.findOne({ 'appLoginUser': name }, function (err, user) {
        if (err) { return done(err); }
        if (!user) {
            console.log('!user in Local user');
            response.send({
                user: 'NO'
            })
        } else {

            Info.comparePassword(password, user.appLoginPwd, function (isMatch) {
                if (isMatch) {
                    //token generienen , abspeichern und zurücksenden.. 
                    crypto.randomBytes(50, function (err, buf) {
                        if (err) {
                            console.log('error in tokenCryptoerstellung')
                        } else {
                            var token = buf.toString('hex');
                            //token mit eventID abspeichern
                            var newToken = new Token({
                                token: token,
                                eventId: user.eventId,
                            });
                            Token.saveToken(newToken, function (err, token) {
                                if (err) {
                                    console.log('token konnte nicht gespeichert werden.. try another time')
                                } else {
                                    console.log('token wurde erfolgreich gespeichert' + token);

                                    //nun noch die infos holen.. 
                                    Event.getEventById(token.eventId, function (err, event) {
                                        if (err) {
                                            console.log('event findOne ist im err..' + err);
                                        } else {
                                            Ticket.getTicketsByEventId(token.eventId, function (err, tickets) {
                                                if (err) {
                                                    console.log('getTicketsByEventID ist im err...' + err);
                                                } else {
                                                    response.send({
                                                        token: token,
                                                        event: event,
                                                        tickets: tickets
                                                    })
                                                }
                                            })
                                        }
                                    })
                                }
                            })
                        }
                    });
                } else {
                    console.log('!user in Local pwd');
                    response.send({
                        user: 'MISMATCH'
                    })
                }
            });
        }
    });

});

/*
router.get('/getEvents', ensureAuthenticated, function (req, res) {
    Event.getEvents(function (err, events) {
        if (err) {
            console.log('err !!!!!!!!!!!!: ' + err);
        }
        console.log('events sind : ' + events);
        res.send({
            events: events
        });
    });

});*/

router.get('/logout', function (req, res) {
    req.logout();
    req.flash('success', 'Sie sind ausgeloggt');
    res.redirect('/');
    //res.send('respond with a resource');
});




module.exports = router;