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
var nodemailer = require('nodemailer');
var Event = require('../models/event');
var Ticket = require('../models/tickets');
var Eintritt = require('../models/eintritte');
const pdfMakePrinter = require('pdfmake');
var Promise = require("bluebird");
var bodyParser = require('body-parser');
// create application/json parser
var jsonParser = bodyParser.json()

var async = require("async");
var crypto = require('crypto');
var nodemailer = require('nodemailer');
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
    var ticketsNumber = cleanInt(req.body.ticketsNumber);;
    var ticket = req.body.ticketId[0];
    var best = cleanInt(req.body[ticket]);

    var dic = {
        [ticket]: best
    };

    for (y = 1; y < ticketsNumber; y++) {
        var ticket = req.body.ticketId[y];
        var bestellung = req.body[ticket];
        dic[ticket] = bestellung;
    }
    console.log('hiere kommt das Dictionaly: ');
    console.log(dic);


    // here is a code using promises :) 
    function doSomething() {
        return new Promise((resolve, reject) => {
            console.log("It is done.");
            // Succeed half of the time.
            if (Math.random() > .5) {
                resolve("SUCCESS")
            } else {
                reject("FAILURE")
            }
        })
    }

    checkOrder(dic).then(orderNow, failureCallback);
    //order(dic).then(successCallback, failureCallback);

    // pretty nice hä 


    function orderNow(dic) {
        console.log('übergeben wird das DIC : ' + dic);
        order(dic).then(successCallback, failureCallback);

    }
    function successCallback(result) {
        console.log("It succeeded with " + result);
        //req.pipe(res);

        var email = req.body.email;
        console.log('email ist : '+ email);

        saveEintritte(result, email).then(sendPdfNow, failureCallback);

    }
    function sendPdfNow(result) {
        //sendPdf(result).then(renderBuyed, failureCallback);

        //function renderBuyed(result) {

            res.render('buyed', {
                result: result
            });
       // }
    }

    function sendPdf(obj) {
        return new Promise((resolve, reject) => {

        })
    }

    function saveEintritte(obj, email) {
        return new Promise((resolve, reject) => {
            console.log('in save Eintritte');
            var dic = {};
            var gesamt = 0;
            for (var key in obj) {
                gesamt = gesamt + cleanInt(obj[key]);               
            }
            console.log('gesamt tickets : ' + gesamt);
            var gespeichert = 0;
            for (var key in obj) {
                var ticketId = key;
                var bestellung = cleanInt(obj[ticketId]);
                console.log(' ticketid ist :' + ticketId);
                console.log('bestellung ist : '+ bestellung);
                for (i = 0; i < bestellung; i++) {
                    console.log('for loope inner i ist = '+ i);
                    var newEintritt = new Eintritt({
                        email: email,
                        ticketId: ticketId
                    })
                    Eintritt.saveEintritt(newEintritt, function (err, eintritt) {
                        if (err) {
                            reject(err);
                        } else {
                            dic[eintritt.id] = eintritt.ticketId;
                            console.log('save eintritt erfolgreich DIC : ' + dic);
                            gespeichert = gespeichert + 1;
                            console.log('gespeichert sind : ' + gespeichert);
                            console.log('gesamt sind : '+ gesamt);
                            if (gespeichert >= gesamt) {
                                console.log('wird resolved!!!');
                                resolve(dic);
                            }
                        }
                    })
                }
            }
        })
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

    function order(obj) {
        return new Promise((resolve, reject) => {
            console.log('in ORDER NOW');
            console.log('das ist der übergebene schaiss : ' + obj)
            var dic = {};
            for (var key in obj) {

                var ticketId = key;
                console.log('ist das der rechte weg ' + ticketId)

                Ticket.findById(ticketId).then(function (ticket) {
                    var bestellung = cleanInt(obj[ticket.id]);
                    console.log('ist das die bestellung :' + bestellung)
                    console.log('here kommt das ticket :' + ticket);
                    var anzahl = cleanInt(ticket.anzahl);
                    var verkauft = cleanInt(ticket.verkauft);

                    var uebrig = anzahl - verkauft;
                    console.log('anzahl - verkauft iost : ' + uebrig);
                    var uebrigAfter = verkauft + bestellung;
                    console.log('bestellung und verkauft ist : ' + uebrigAfter);
                    if (bestellung > 0) {
                        console.log('if bestellung ist > 0 : hier ist der wert : ' + bestellung);
                        if (uebrig >= bestellung && uebrigAfter <= anzahl) {
                            var options = {
                                new: true,
                                runValidators: true
                            }
                            var query = { _id: ticket.id };
                            Ticket.findOneAndUpdate(query, { $inc: { verkauft: bestellung } }, options).then(function (newTicket) {

                                dic[newTicket.id] = bestellung;
                                console.log('Länge ist :' + Object.keys(dic).length);
                                if (Object.keys(dic).length >= Object.keys(obj).length) {
                                    console.log('Länge ist :' + Object.keys(dic).length);
                                    resolve(dic);
                                }
                            },
                                function (err) {
                                    console.log('ist in promise of update.. error : ' + err);
                                    reject(err);
                                })
                        } else {
                            reject(ticket);
                        }
                    } else {
                        console.log('ELSE bestellung ist = 0 : hier ist der wert : ' + bestellung);
                        dic[ticket.id] = bestellung;
                        console.log('Länge ist :' + Object.keys(dic).length);
                        if (Object.keys(dic).length >= Object.keys(obj).length) {
                            console.log('Länge ist :' + Object.keys(dic).length);
                            resolve(dic);
                        }

                    }
                }, function (err) {
                    console.log('ist in promise of find.. error : ' + err);
                    reject(err);
                })
            }
            console.log('my loop is finished : ' + obj);
        })
    }

    function checkOrder(obj) {
        return new Promise((resolve, reject) => {
            console.log('in CHECK ORDER');
            var dic = {};
            for (var key in obj) {
                var ticketId = key;
                console.log('ist das der rechte weg ' + ticketId)


                Ticket.findById(ticketId).then(function (ticket) {
                    var bestellung = cleanInt(obj[ticket.id]);
                    console.log('ist das die bestellung :' + bestellung)
                    console.log('here kommt das ticket :' + ticket);
                    var anzahl = cleanInt(ticket.anzahl);
                    var verkauft = cleanInt(ticket.verkauft);

                    var uebrig = anzahl - verkauft;
                    console.log('anzahl - verkauft iost : ' + uebrig);
                    var uebrigAfter = verkauft + bestellung;
                    console.log('bestellung und verkauft ist : ' + uebrigAfter);

                    if (uebrig < bestellung || uebrigAfter > anzahl) {
                        reject(ticket);
                    } else {
                        dic[ticket.id] = bestellung;
                        console.log('Länge ist :' + Object.keys(dic).length);
                        if (Object.keys(dic).length >= Object.keys(obj).length) {
                            console.log('Länge ist :' + Object.keys(dic).length);
                            resolve(dic);
                        }
                    }
                }, function (err) {
                    console.log('ist in promise of find.. error : ' + err);
                    reject(err);
                })
            }
        })
    }
});

function cleanInt(x) {
    x = Number(x);
    return x >= 0 ? Math.floor(x) : Math.ceil(x);
}


router.post('/sendPDF', function (req, res) {
    console.log('in buytickets');
    //psp provider API Call here

    generatePdf(docDefinition, (response) => {

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
            } else {
                req.flash('success', 'Eine Email wurde an ' + req.body.email + ' gesendet');
            }

            console.log('sent')
            res.redirect('/');
        });
        console.log('done done');
    });
})

router.post('/openPDF', function (req, res) {
    console.log('in openPDF');
    generatePdf(docDefinition, (response) => {
        res.setHeader('Content-Type', 'application/pdf');
        res.send(response);
    });
})

//pdf

const docDefinition = {
    header: 'simple text',

    footer: {
        columns: [
            'Left part',
            { text: 'Right part', alignment: 'right' }
        ]
    },
    pageMargins: [40, 60, 40, 60],

    content: [
        // if you don't need styles, you can use a simple string to define a paragraph
        'This is a standard paragraph, using default style',

        { text: 'Title', styles: 'header', fontSize: 30 },

        // using a { text: '...' } object lets you set styling properties
        { text: 'This paragraph will have a bigger font', fontSize: 15 },

        { text: 'Text on Landscape 2', pageOrientation: 'portrait', pageBreak: 'after' },
        { text: 'Text on Portrait 2' },

        // if you set the value of text to an array instead of a string, you'll be able
        // to style any part individually
        {
            text: [
                'This paragraph is defined as an array of elements to make it possible to ',
                { text: 'restyle part of it and make it bigger ', fontSize: 15 },
                'than the rest.'
            ]
        },
        // basic usage
        { qr: 'text in QR' },

        {
            layout: 'lightHorizontalLines', // optional
            table: {
                // headers are automatically repeated if the table spans over multiple pages
                // you can declare how many rows should be treated as headers
                headerRows: 1,
                widths: ['*', 'auto', 100, '*'],

                body: [
                    ['First', 'Second', 'Third', 'The last one'],
                    ['Value 1', 'Value 2', 'Value 3', 'Value 4'],
                    [{ text: 'Bold value' }, 'Val 2', 'Val 3', 'Val 4']
                ]
            }
        },
        {
            columns: [
                {
                    // auto-sized columns have their widths based on their content
                    width: 'auto',
                    text: 'First column'
                },
                {
                    // star-sized columns fill the remaining space
                    // if there's more than one star-column, available width is divided equally
                    width: '*',
                    text: 'Second column'
                },
                {
                    // fixed width
                    width: 100,
                    text: 'Third column'
                },
                {
                    // % width
                    width: '20%',
                    text: 'Fourth column'
                }
            ],
            // optional space between columns
            columnGap: 10
        },
        'This paragraph goes below all columns and has full width'

    ],
    styles: {
        header: {
            fontSize: 22,
        },
        anotherStyle: {
            italics: true,
            alignment: 'right'
        }
    }
};


function generatePdf(docDefinition, callback) {
    try {
        /*var fontDescriptors = {
            Roboto: {
                normal: 'Roboto-Regular.ttf',
                bold: 'Roboto-Medium.ttf',
                italics: 'Roboto-Italic.ttf',
                bolditalics: 'Roboto-MediumItalic.ttf'
            }
        }; */
        const printer = new pdfMakePrinter({
            Roboto: { normal: new Buffer.from(require('pdfmake/build/vfs_fonts.js').pdfMake.vfs['Roboto-Regular.ttf'], 'base64') }
        });
        console.log('new PRINTER made');
        const doc = printer.createPdfKitDocument(docDefinition);
        console.log('doc made');
        let chunks = [];

        doc.on('data', (chunk) => {
            chunks.push(chunk);
        });

        doc.on('end', () => {
            //followin two to send it as an attachement..
            //const result = Buffer.concat(chunks);
            //callback('data:application/pdf;base64,' + result.toString('base64'));

            //tihis one to open in browser (also to send apparently)..
            callback(Buffer.concat(chunks));

            console.log('result buffered');
        });

        doc.end();

    } catch (err) {
        console.log('in CATCH');
        throw (err);
    }
};

module.exports = router;