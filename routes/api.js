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
var Eintritt = require('../models/eintritte');

router.get('/buchen/:eintrittID&:token', function (request, response){
    const eintrittID = request.params.eintrittID;
    const token = request.params.token;
    Token.getToken(token, function (err, newToken){
        if (err){
            response.send({
                status: 'noToken'
            })
        }else {
            if (newToken.token = token){
                //token ist bewilligt nun kann gebucht werden
                Eintritt.findOne(eintrittID, function(err, eintritt){
                    if (err){
                        response.send({
                            status: 'noTicket'
                        })
                    }else {
                        if (eintritt.abbgebucht == false){
                            //noch gueltig 
                            var options = {
                                new: true,
                                runValidators: true
                            }
                            var query = { _id: eintritt.id };
                            Eintritt.findOneAndUpdate(query, { $inc: { abbgebucht: true } }, options).then(function (newEintritt) {
                                if (newEintritt.abbgebucht == true){
                                    //erfolgreich abbgebucht
                                    response.send({
                                        status: 'OK'
                                    })
                                }
                            });        
                        }else {
                            response.send({
                                status: 'noTicket'
                            })
                        }
                    }
                })
            }
        }
    })
})
//login
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
                                                        tickets: tickets,
                                                        user: 'OK'
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