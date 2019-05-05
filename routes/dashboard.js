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

router.get('/newtickets', function (req, res) {
    res.render('newtickets', {
        User: req.user
    });
});

//get the event for the seller
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
                    appNpay.getAppNpayByEventId(event.id, function (err, infos) {
                        if (err) {
                            console.log('error is thorwn in get infos');
                            console.log(err);
                        } else {
                            console.log('infos sind : ______')
                            console.log(infos);
                            console.log('appLoginUser : ' + infos.appLoginUser);
                            console.log('appLoginPwd : ' + infos.appLoginPwd);
                            console.log('app payment : ' + infos.payment);
                            console.log('app app : ' + infos.app);
                            res.render('checkEvent', {
                                user: req.user,
                                event: event,
                                tickets: tickets,
                                infos: infos
                            });
                        }
                    });
                }
            });
        }
    });
});

//render the forgot page for the specific user
router.get('/forgot', function (req, res) {
    res.render('forgot', {
        User: req.user
    });
});

//the seller would like to open a new event
router.post('/newevent', function (req, res) {
    console.log(req.body.veranstalter);
    console.log('((((((((((((((((((')
    console.log(req.body.title);
    res.render('newDescription', {
        user: req.user,
        title: req.body.title,
        veranstalter: req.body.veranstalter
    });

});


router.post('/neweventDescription', parser.single('new_pic'), function (req, res, next) {
    console.log('whats the problem..');
    //upload image ????????????????????
    if (req.file) {
        const image = {};
        console.log('Uploading File...');
        console.log(req.file) // to see what is returned to you
        console.log('POST///reqfile');

        image.url = req.file.url;
        image.id = req.file.public_id;

        console.log('übersprungen..')
        res.render('newYoutube', {
            user: req.user,
            title: req.body.title,
            veranstalter: req.body.veranstalter,
            picUrl: image.url,
            picId: image.id,
            beschreibung: req.body.beschreibung,
            von: req.body.von,
            bis: req.body.bis
        });
    } else {
        var imageUrl = null;
        var imageID = null;

        res.render('newYoutube', {
            user: req.user,
            title: req.body.title,
            veranstalter: req.body.veranstalter,
            picUrl: imageUrl,
            picId: imageID,
            beschreibung: req.body.beschreibung,
            von: req.body.von,
            bis: req.body.bis
        });
    }
});

// braucht es mit der back funkiton nicht.. lasse es jedoch trotzdem hier.. 
router.get('/neweventYoutube', function (req, res) {
    res.render('neweventYoutube', {
        user: req.user,
        title: req.body.title,
        veranstalter: req.body.veranstalter,
        picUrl: req.body.picUrl,
        picId: req.body.picId,
        beschreibung: req.body.beschreibung,
        youtube: req.body.youtube,
        von: req.body.von,
        bis: req.body.bis
    });
});
router.post('/neweventYoutube', function (req, res) {

    res.render('newLokation', {
        user: req.user,
        title: req.body.title,
        veranstalter: req.body.veranstalter,
        picUrl: req.body.picUrl,
        picId: req.body.picId,
        beschreibung: req.body.beschreibung,
        youtube: req.body.youtube,
        von: req.body.von,
        bis: req.body.bis
    });
});

router.post('/neweventLokation', function (req, res) {
    console.log(req.body.pic);

    if (req.body.picUrl) {
        console.log(req.body.picUrl);

    } else {
        console.log('no pic.url found....___')
    }

    var newEvent = new Event({
        title: req.body.title,
        veranstalter: req.body.veranstalter,
        von: req.body.von,
        bis: req.body.bis,
        beschreibung: req.body.beschreibung,
        picUrl: req.body.picUrl,
        picId: req.body.picId,
        youtube: req.body.youtube,
        lokation: req.body.lokation,
        address: req.body.address,
        plz: req.body.plz,
        userId: req.user.id
    });

    Event.createEvent(newEvent, function (err, event) {
        console.log('create event');
        if (err) {
            req.flash('error', 'es ist etwas schiefgelaufen, warten Sie einen Moment und probieren Sie es erneut');
            res.location('/dashboard/newtickets');
            res.redirect('/dashboard/newtickets');
        } else {
            console.log('event created');
            req.flash('success', 'Erfolgreich eröffnet');
            // events ist gespeichert machen wir mit den tickets weiter
            res.render('newtickets', {
                user: req.user,
                title: req.body.title,
                veranstalter: req.body.veranstalter,
                eventId: event.id
            });
        }
    });
});

//the seller would like to finish the eventopening
router.post('/saveticket', function (req, res) {
    console.log('savetickets POST');
    var kategorie = req.body.kategorie;
    var gueltig_datum = req.body.gueltig_datum;
    var gueltig_time = req.body.gueltig_time;
    var tueroeffnung = req.body.tueroeffnung;
    var anzahl = req.body.anzahl;
    var alter = req.body.alter;
    var biswann = req.body.biswann;
    var preis = req.body.preis;
    var eventId = req.body.eventId;

    console.log('req.body');
    console.log(req.body);
    console.log('/////');

    var newTicket = new Ticket({

        kategorie: kategorie,
        gueltig_datum: gueltig_datum,
        gueltig_time: gueltig_time,
        tueroeffnung: tueroeffnung,
        anzahl: anzahl,
        alter: alter,
        biswann: biswann,
        preis: preis,
        verkauft: 0,
        eventId: eventId
    });

    Ticket.saveTickets(newTicket, function (err, ticket) {
        console.log('create tickets');
        if (err) {
            req.flash('error', 'es ist etwas schiefgelaufen, warten Sie einen Moment und probieren Sie es erneut');
            console.log('err is da.. ')
            res.render('newtickets', {
                user: req.user,
                title: req.body.title,
                veranstalter: req.body.veranstalter,
                eventId: req.body.eventId
            });
        } else {
            console.log('ticket created');
            req.flash('success', 'Erfolgreich tickets gespeichert');


            if (req.body.submit == 'finish') {

                res.render('abschluss', {
                    user: req.user,
                    title: req.body.title,
                    veranstalter: req.body.veranstalter,
                    eventId: req.body.eventId
                });
            }
            if (req.body.submit == 'more') {
                res.render('newtickets', {
                    user: req.user,
                    title: req.body.title,
                    veranstalter: req.body.veranstalter,
                    eventId: req.body.eventId
                });
            }
        }
    });

})

router.post('/abschluss', function (req, res) {
    console.log('post abschluss');
    console.log(req.body);


    if (req.body.halo == 'on') {
        console.log('war on');
        var app = true;
        var appLoginUser = req.body.appLoginUser;
        var appLoginPwd = req.body.appLoginPwd;

    } else {
        console.log('war off');
        var app = false;
        var appLoginUser;
        var appLoginPwd;
    }
    if (req.body.payment == 'prozent') {
        console.log('war prozent');
        var payment = true;
    } else {
        console.log('war pauschal');
        var payment = false;
    }

    var newappNpay = new appNpay({
        app: app,
        payment: payment,
        appLoginUser: appLoginUser,
        appLoginPwd: appLoginPwd,
        eventId: req.body.eventId
    });

    appNpay.saveAppNpayment(newappNpay, function (err, infos) {
        console.log('create infos');
        if (err) {
            console.log(err);
            console.log(err.errors);
            if (err.errors.appLoginUser) {
                req.flash('error', 'Wählen Sie einen anderen Benutzernamen');
            } else {
                req.flash('error', 'es ist etwas schiefgelaufen, warten Sie einen Moment und probieren Sie es erneut');
            }
            res.render('abschluss', {
                user: req.user,
                title: req.body.title,
                veranstalter: req.body.veranstalter,
                eventId: req.body.eventId
            });

        } else {
            console.log('event created with tickets and infos');
            req.flash('success', 'Erfolgreich eröffnet');
            res.location('/users/mainpage');
            res.redirect('/users/mainpage');
        }
    });
})

module.exports = router;