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


router.post('/buyTickets', jsonParser, function (req, res) {
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

        function notSend(result) {
            //pdf konnte nicht gesendet werden
            req.flash('error ', result)
            res.render('buyed', {
                result: result
            });
        }
    }

    function sendIt(docDefinition, obj) {
        console.log('in SENDIT');

        console.log('doc definition soll sein  .:' + Object.entries(docDefinition));
        console.log('header : ' + docDefinition.header);
        console.log('contenr : '+ Object.entries(docDefinition.content.text));
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
                } else {
                    req.flash('success', 'Eine Email wurde an ' + req.body.email + ' gesendet' + obj);

                    /* SUcess TEXT:
                     Erfolgreich: Vielen Dank für Ihre Steuerdeklaration. Sie erhalten in den nächsten Minuten eine Bestätigung per E-mail mit dem PDF mit den von Ihnen gemachten Angaben. Klicken Sie auf den PDF-Knopf, um das PDF mit Ihren Angaben zu sehen.
                    console.log('this obj' + obj);
                    /*res.render('buyed', {
                         response: response
                     }); */
                    res.setHeader('Content-Type', 'application/pdf');
                    res.send(response);
                }

                console.log('sent')

            });
            console.log('done done');
        });
    }
});

router.post('/openPDF', function (req, res) {
    console.log('in openPDF');
    console.log('response ist :' + req.body.response);
    //var obj = JSON.stringify(req.body.obj);
    //console.log('obj stringify ist :' + obj);

    //docDefinition(obj).then(openIt, notOpened);

    function openIt(docDefinition, obj) {
        PDF.generatePdf(docDefinition, (response) => {
            res.setHeader('Content-Type', 'application/pdf');
            res.send(response);
        });
    }

    function notOpened(result) {
        //pdf konnte nicht gesendet werden
        req.flash('error ', result)
        res.render('buyed', {
            result: result
        });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.send(response);

})

function cleanInt(x) {
    x = Number(x);
    return x >= 0 ? Math.floor(x) : Math.ceil(x);
}
module.exports = router;