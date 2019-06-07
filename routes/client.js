var express = require('express');
var router = express.Router();
var multer = require('multer');
//handle file uploads
var upload = multer({ dest: './uploads' });
var flash = require('connect-flash');
var passport = require('passport');
var expressValidator = require('express-validator');
var LocalStrategy = require('passport-local').Strategy;
var async = require("async");
var crypto = require('crypto');
var Event = require('../models/event');
var Ticket = require('../models/tickets');
var Eintritt = require('../models/eintritte');
var Client = require('../models/client');
const pdfMakePrinter = require('pdfmake');
var Promise = require("bluebird");
var bodyParser = require('body-parser');
// create application/json parser
var jsonParser = bodyParser.json()
var PDF = require('../routes/generatePDF');
var buyEintritt = require('../routes/order');
var nodemailer = require('nodemailer');

var async = require("async");
var crypto = require('crypto');
var fs = require('fs');

router.get('/clientMainpage', function (req, res, next) {
    console.log('get mainpage');
    var e = Event.getEvents(function (err, events) {
        if (err) {
            console.log('err !!!!!!!!!!!!: ' + err);
        }
        console.log('events sind : ' + events);
        res.render('clientMainpage', {
            events: events
        });
    });
});

//get the event for the client
router.get('/getEvent/:id', function (req, res) {
    console.log('is in get event');
    Event.getEventById(req.params.id, function (err, event) {
        if (err) {
            console.log('error is thrown in get eventID');
            console.log(err);
        } else {
            console.log('event is: ' + event);
            console.log('id is : ' + event.id);
            Ticket.getTicketsByEventId(event.id, function (err, tickets) {
                if (err) {
                    console.log('error is thrown in get tickt');
                    console.log(err);
                } else {
                    console.log('tickets array : ' + tickets)
                    res.render('checkEventClient', {
                        event: event,
                        tickets: tickets
                    });
                }
            });
        }
    });
});

//get the event for the client
router.get('/buyTickets/:id', function (req, res) {
    console.log('is in get event');
    Event.getEventById(req.params.id, function (err, event) {
        if (err) {
            console.log('error is thrown in get eventID');
            console.log(err);
        } else {
            console.log('event is: ' + event);
            console.log('id is : ' + event.id);
            Ticket.getTicketsByEventId(event.id, function (err, tickets) {
                if (err) {
                    console.log('error is thrown in get tickt');
                    console.log(err);
                } else {
                    console.log('tickets array : ' + tickets)
                    res.render('buyTickets', {
                        event: event,
                        tickets: tickets
                    });
                }
            });
        }
    });
});
function ensureAuthenticated(req, res, next) {
    //passport function 
    if (req.isAuthenticated()) {
        return next();
    }
    console.log(req.body);
    console.log('in buytickets');
    var ticketsNumber = cleanInt(req.body.ticketsNumber);
    console.log('Anzahl ticket kategorien : ' + ticketsNumber);
    if (ticketsNumber > 1) {
        var ticket = req.body.ticketId[0];
        console.log('TicketID ist :' + ticket);
        var best = cleanInt(req.body[ticket]);
        console.log('BEstellung beträtg :' + best);
    } else {
        var ticket = req.body.ticketId;
        console.log('TicketID ist :' + ticket);
        var best = cleanInt(req.body[ticket]);
        console.log('BEstellung beträtg :' + best);
    }

    var dic = {
        [ticket]: best
    };

    //falls es mehr hat alles in ein array
    for (y = 1; y < ticketsNumber; y++) {
        var ticket = req.body.ticketId[y];
        var bestellung = req.body[ticket];
        dic[ticket] = bestellung;
    }
    console.log('hiere kommt das Dictionaly: ');
    console.log(dic);
   // res.cookie('dic' , dic, {maxAge : 9999});
   req.session.dic = dic;
    res.redirect('clientRegister/');
}

router.get('/clientRegister/', function (req, res, next) {
   // var dic = req.params.dic;
   //console.log(req.body.ticketId)
    //var dic = dic1.json();
    //console.log(dic.toString());
    //res.cookie('dic' , dic, {maxAge : 9999});
    console.log(req.session.dic);
    console.log('get clientRegister');
    res.render('clientRegister', {
    });
});

router.post('/buyTickets', ensureAuthenticated, jsonParser, function (req, res) {
    //psp provider API Call here
    console.log(req.body);
    console.log('in buytickets');
    var ticketsNumber = cleanInt(req.body.ticketsNumber);
    console.log('Anzahl ticket kategorien : ' + ticketsNumber);
    if (ticketsNumber > 1) {
        var ticket = req.body.ticketId[0];
        console.log('TicketID ist :' + ticket);
        var best = cleanInt(req.body[ticket]);
        console.log('BEstellung beträtg :' + best);
    } else {
        var ticket = req.body.ticketId;
        console.log('TicketID ist :' + ticket);
        var best = cleanInt(req.body[ticket]);
        console.log('BEstellung beträtg :' + best);
    }

    var dic = {
        [ticket]: best
    };

    //falls es mehr hat alles in ein array
    for (y = 1; y < ticketsNumber; y++) {
        var ticket = req.body.ticketId[y];
        var bestellung = req.body[ticket];
        dic[ticket] = bestellung;
    }
    console.log('hiere kommt das Dictionaly: ');
    console.log(dic);

    buyEintritt.checkOrder(dic).then(orderNow, failureCallback);

    function orderNow(dic) {
        console.log('übergeben wird das DIC : ' + dic);
        buyEintritt.order(dic).then(successCallback, failureCallback);

    }
    function successCallback(result) {
        console.log("It succeeded with " + result);
        //req.pipe(res);
        var email = req.body.email;
        console.log('email ist : ' + email);
        buyEintritt.saveEintritte(result, email).then(sendPdfNow, failureCallback);
    }

    function failureCallback(ticket) {
        console.log("It failed with " + ticket);
        var uebrig = cleanInt(ticket.anzahl) - cleanInt(ticket.verkauft);
        console.log('übreig snd :' + uebrig);
        Event.getEventById(ticket.eventId, function (err, event) {
            if (err) {
                console.log('error is thrown in get eventID');
                console.log(err);
            } else {
                console.log('event is: ' + event);
                console.log('id is : ' + event.id);
                Ticket.getTicketsByEventId(event.id, function (err, tickets) {
                    if (err) {
                        console.log('error is thrown in get tickt');
                        console.log(err);
                    } else {
                        console.log('tickets array : ' + tickets)
                        req.flash('error', 'die "' + ticket.kategorie + '" sind entweder <b>ausverkauft</b> oder Sie wollten <b>zu viel bestellen...</b> probieren Sie nochmals.. (übrig sind ' + uebrig + ')')
                        res.render('buyTickets', {
                            event: event,
                            tickets: tickets
                        });
                    }
                });
            }
        });
    }

    function sendPdfNow(result) {
        console.log('in send PDF now Result übergabe ist :' + result)
        PDF.docDefinition(result).then(sendIt, notSend);
        // res.render('buyed', {
        //     response: result
        // });


        function notSend(result) {
            //pdf konnte nicht gesendet werden
            req.flash('error ', result)
            res.render('buyed', {
                response: result
            });
        }
    }

    function sendIt(docDefinition, obj) {
        console.log('in SENDIT');

        //console.log('doc definition soll sein  .:' + Object.entries(docDefinition));
        //console.log('header : ' + docDefinition.header);
        //console.log('contenr : '+ Object.entries(docDefinition.content.text));
        //psp provider API Call here

        PDF.generatePdf(docDefinition, (response) => {

            console.log('pdf generiert');
            var smtpTrans = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'dittrich.yannick@gmail.com',
                    pass: 'Wh8sApp1993*/-'
                }
            });
            var mailOptions = {
                to: req.body.email,
                from: 'info@silvering.ch  ',
                subject: 'PDF zurücksetzen für Ticki',
                text: 'Für Ihr Konto wurde ein PDF beantragt\n\n',
                attachments: [{
                    filename: 'tickets.pdf',
                    content: response,
                    contentType: 'application/pdf'
                }]
            };

            smtpTrans.sendMail(mailOptions, function (err) {
                console.log('in sendMail');
                if (err) {
                    req.flash('error', 'Da ist was mit :' + req.body.email + ' schiefgelaufen');
                    console.log('this err' + err);
                    console.log('this obj' + obj);
                    /*res.render('buyed', {
                        response: response
                    });*/
                    res.setHeader('Content-Type', 'application/pdf');
                    res.send(response);
                    return handleError(err);
                } else {


                    req.flash('success', 'Eine Email wurde an ' + req.body.email + ' gesendet ' + obj);

                    // Sucess TEXT:
                    //Erfolgreich: Vielen Dank für Ihre Steuerdeklaration. Sie erhalten in den nächsten Minuten eine Bestätigung per E-mail mit dem PDF mit den von Ihnen gemachten Angaben. Klicken Sie auf den PDF-Knopf, um das PDF mit Ihren Angaben zu sehen.
                    // console.log('this obj' + obj);
                    Eintritt.getEintritteByEmail(req.body.email, function (err, eintritte) {
                        if (err) {
                            console.log('keine eintritte gefunden')
                            return handleError(err);
                        } else {
                            console.log('eintritte sidn: ')
                            console.log(eintritte);
                            var bestellung = [];
                            var i = 0;
                            for (eintritt in eintritte) {

                                console.log(eintritte[eintritt].ticketId);

                                console.log('in for loop');
                                Ticket.findById(eintritte[eintritt].ticketId, function (err, ticket) {
                                    if (err) {
                                        console.log('kein ticket gefunden')
                                        return handleError(err);
                                    } else {
                                        console.log(ticket);
                                        Event.getEventById(ticket.eventId, function (err, event) {
                                            if (err) {
                                                console.log('keine events gefunden')
                                                return handleError(err);
                                            } else {

                                                bestellung.push({ event: event, ticket: ticket, eintritt: eintritte[eintritt] })
                                                //if (i = eintritte.length) {
                                                i = i + 1;
                                                if (bestellung.length >= Object.keys(eintritte).length) {
                                                    console.log(bestellung);

                                                    res.render('buyed', {
                                                        bestellung: bestellung
                                                    });
                                                }
                                            }
                                        })
                                    }
                                })
                            }
                            // eintritte.forEach(function (eintritt) {

                            // });

                        }
                    })


                    // res.setHeader('Content-Type', 'application/pdf');
                    // res.send(response);
                }

                console.log('sent')

            });
            console.log('done done');
        });
    }
});

router.post('/openPDF', function (req, res) {
    console.log('in openPDF');
    console.log('response ist :' + req.body.response[0]);
    var obj = req.body.response;
    //var obj = JSON.stringify(req.body.obj);
    //console.log('obj stringify ist :' + obj);
    var b = new Buffer(req.body.response, 'base64')
    var s = b.toString();

    var b = new Buffer(req.body.response
    );
    // If we don't use toString(), JavaScript assumes we want to convert the object to utf8.
    // We can make it convert to other formats by passing the encoding type to toString().
    var s = b.toString('base64');

    //PDF.docDefinition(req.body.response).then(openIt, notOpened);
    openIt(s);
    function openIt(docDefinition) {
        PDF.generatePdf(docDefinition, (response) => {
            res.setHeader('Content-Type', 'application/pdf');
            res.send(response);
        });
    }

    function notOpened(result) {
        //pdf konnte nicht gesendet werden
        req.flash('error ', result)
        res.render('buyed', {
            response: result
        });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.send(response);

})

function cleanInt(x) {
    x = Number(x);
    return x >= 0 ? Math.floor(x) : Math.ceil(x);
}


router.post('/clientLogin', (req, res) =>
    passport.authenticate('local', {
        successRedirect: '/client/buyTickets',
        failureFlash: 'Benutzername oder Passwort ist falsch :(',
        failureRedirect: '/clientRegister'
    })
        (req, res)
);

passport.serializeUser(function (client, done) {
    done(null, client.id);
});

passport.deserializeUser(function (id, done) {
    Client.getClientById(id, function (err, client) {
        done(err, client);
    });
});

passport.use(new LocalStrategy(
    function (name, password, done) {
        console.log('!client in Local Strategy');
        console.log('name ist : ' + name);
        console.log('password ist : ' + password);
        Client.findOne({ $or: [{ 'email': name }, { 'name': name }] }, function (err, client) {
            if (err) { return done(err); }
            if (!client) {
                console.log('!client in Local user');
                return done(null, false, { message: 'Email oder Benutzername ungültig' });
            }
            Client.comparePassword(password, client.password, function (err, isMatch) {
                if (err) return done(err);
                if (isMatch) {
                    console.log('isMatch')
                    return done(null, client);
                } else {
                    console.log('!client in Local pwd');
                    return done(null, false, { message: 'Passwort ungültig' });
                }
            });
        });
    }
));
module.exports = router;