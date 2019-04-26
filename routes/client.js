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
var appNpay = require('../models/appNpayment');
const pdfMakePrinter = require('pdfmake');

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

router.post('/buyTickets', function (req, res) {
    console.log('in buytickets');
    //psp provider API Call here

    res.render('buyed', {

    });
})

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
            if (err){
                req.flash('error', 'Da ist was mit :' + req.body.email + ' schiefgelaufen');
                console.log('this err' + err);
            }else {
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
    content: [
        // if you don't need styles, you can use a simple string to define a paragraph
        'This is a standard paragraph, using default style',

        // using a { text: '...' } object lets you set styling properties
        { text: 'This paragraph will have a bigger font', fontSize: 15 },

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

        // colored QR
        { qr: 'text in QR', foreground: 'red', background: 'yellow' },

    ]
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
            //const result = Buffer.concat(chunks);
            console.log('result buffered');
            callback(Buffer.concat(chunks));
            //callback('data:application/pdf;base64,' + result.toString('base64'));
        });

        doc.end();

    } catch (err) {
        console.log('in CATCH');
        throw (err);
    }
};

module.exports = router;