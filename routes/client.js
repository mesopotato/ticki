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

var http = require('http')
    , req = http.IncomingMessage.prototype;


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

// render tickets after login out of the session :)
router.get('/buyTickets', function (req, res) {
    console.log('render tickets after login out of the session dic');
    console.log(req.session.dic);
    var bestellung = [];
    for (var key in req.session.dic) {
        var ticketID = key;
        var anzahl = req.session.dic[ticketID]
        Ticket.findById(ticketID, function (err, ticket) {
            if (err) {
                console.log('kein ticket gefunden')
                return handleError(err);
            } else {
                console.log('consoele logge das ticket');
                console.log(ticket);
                Event.getEventById(ticket.eventId, function (err, event) {
                    if (err) {
                        console.log('keine events gefunden')
                        return handleError(err);
                    } else {

                        bestellung.push({ event: event, ticket: ticket, anzahl: anzahl })
                        //if (i = eintritte.length) {
                        //i = i + 1;
                        if (bestellung.length >= Object.keys(req.session.dic).length) {
                            console.log('consoele logge die bestellung');
                            console.log(bestellung);

                            console.log('was ist in diesem REQ????????')
                            console.log(req);

                            res.render('buyTicketsAfterLogin', {
                                user: req.client,
                                bestellung: bestellung
                            });
                        }
                    }
                })
            }
        })

    }
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

//get the event for the client.....
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




// LOGIN_ LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN 
function ensureAuthenticated(req, res, next) {
    //passport function 
    if (req.isAuthenticated()) {
        console.log('req.isAuthenticated is TRUE')
        return next();
    }
    console.log(req.body);
    console.log('in ensureAuth');
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
    req.session.lastUrl = '../client/buyTickets';
    res.redirect('../client/clientRegister');
}


router.get('/clientRegister/', function (req, res, next) {
    console.log(req.session.dic);
    console.log('get clientRegister');
    res.render('clientRegister', {
    });
});

// router.post('/clientLogin', (req, res) =>
//     passport.authenticate('local', {
//         successRedirect: req.session.lastUrl,
//         failureFlash: 'Benutzername oder Passwort ist falsch :(',
//         failureRedirect: '../client/clientRegister'
//     })
//         (req, res)
// );

router.post('/clientLogin', function (req, res, next) {
    console.log('in clientLogin');
    passport.authenticate('client-signup', function (err, client, info) {
        if (err) {
            console.log('err nache authenticate');
            return next(err);
        }
        if (!client) {
            console.log('no client');
            return res.redirect('../client/clientRegister');
        }
        req.logIn(client, function (err) {
            console.log('in req.login callback');
            if (err) { return next(err); }
            console.log('last session UTL ist ');
            console.log(req.session.lastUrl);

            if (req.session.lastUrl) {
                return res.redirect(req.session.lastUrl);
            } else {
                console.log('also redirect Client Mainpage');
                return res.redirect('../client/clientMainpage')
            }


        });
    })(req, res, next);
});

passport.serializeUser(function (client, done) {
    done(null, client.id);
});

passport.deserializeUser(function (id, done) {
    Client.getClientById(id, function (err, client) {
        done(err, client);
    });
});

passport.use('client-signup', new LocalStrategy(
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
        res.render('registerClient', {
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
            var newClient = new Client({
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
            var newClient = new Client({
                name: newusername,
                email: email,
                password: pwd,
                imageId: imageId,
                imageUrl: imageUrl
            });
        }




        //geht dnicht wenn kein bild!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        Client.createClient(newClient, function (err, client) {
            if (err) {
                if (err.errors.name) {
                    req.flash('error', 'Der Benutzername existiert bereits');
                } else if (err.errors.email) {
                    req.flash('error', 'Mit dieser Email wurde bereits ein Konto registriert, loggen Sie sich mit dieser Email ein oder setzen Sie das Psswort zurück');
                } else {
                    req.flash('error', 'es ist etwas schiefgelaufen, warten Sie einen Moment und probieren Sie es erneut');
                }
                res.location('../client/clientRegister');
                res.redirect('../client/clientRegister');
            } else {
                console.log('POST///uaser created');

                //user.imageId = image.id;
                //user.imageUrl = image.url;
                console.log('image :' + client.imageId);
                console.log('image :' + client.imageUrl);

                client.save(function (err) {
                    if (err) {
                        console.log('usr not saved ')
                        return res.redirect('back');
                    } else {
                        console.log('saved also einloggen')
                        req.logIn(client, function (err) {
                            //done(err, user);
                            if (err) { return next(err); }
                            req.flash('success', 'Erfolgreich registriert');
                            if (req.session.lastUrl) {
                                var url = req.session.lastUrl;
                            } else {
                                var url = '/client/clientMainpage';
                            }
                            return res.redirect(url)
                        });
                        //res.location('/users/mainpage');
                        //res.redirect('/users/mainpage');
                    }
                });
            }
        });
    }
    // console.log(req.body)
    // console.log(req.file);
    //  req.body.email
});

// RESET_LOGIN RESET_LOGIN RESET_LOGIN RESET_LOGIN RESET_LOGIN RESET_LOGIN RESET_LOGIN RESET_LOGIN RESET_LOGIN RESET_LOGIN RESET_LOGINRESET_LOGINRESET_LOGIN RESET_LOGIN 
router.post('/forgot', function (req, res, next) {
    async.waterfall([
        function (done) {
            crypto.randomBytes(20, function (err, buf) {
                var token = buf.toString('hex');
                done(err, token);
            });
        },
        function (token, done) {
            Client.findOne({ email: req.body.email }, function (err, client) {
                if (!client) {
                    //   console.log('error', 'No account with that email address exists.');
                    req.flash('error', 'Es wurde kein Konto gefunden. Überprüfen Sie Ihre Eingaben');
                    return res.redirect('/');
                }
                console.log('step 1')
                client.resetPasswordToken = token;
                client.resetPasswordExpires = Date.now() + 3600000; // 1 hour

                client.save(function (err) {
                    done(err, token, client);
                });
            });
        },
        function (token, client, done) {
            console.log('step 2')


            var smtpTrans = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    client: 'dittrich.yannick@gmail.com',
                    pass: 'Wh8sApp1993*/-'
                }
            });
            var mailOptions = {

                to: client.email,
                from: 'info@silvering.ch  ',
                subject: 'Password zurücksetzen für Ticki',
                text: 'Für Ihr Konto wurde eine ZUrücksetzung des Passworts angefragt\n\n' +
                    'Klicken Sie auf folgenden Link um Ihr Passwort zu ändern:\n\n' +
                    'http://' + req.headers.host + '/users/reset/' + token + '\n\n' +
                    'Wenn Sie das Passwort nicht zurücksetzen wollen, können Sie diese Email ignorieren\n'

            };
            console.log('step 3')

            smtpTrans.sendMail(mailOptions, function (err) {
                if (err) {
                    console.log('send ist schiefgelaufen :' + err);
                    req.flash('error', 'Da ist etwas schiefgelaufen ');
                    res.redirect('/');
                }
                req.flash('success', 'Eine Email wurde an ' + client.email + ' gesendet');
                console.log('sent')
                res.redirect('/clientRegister');
            });
        }
    ], function (err) {
        console.log('this err' + ' ' + err)
        res.redirect('/clientRegister');
    });
});

router.get('/forgot', function (req, res) {
    res.render('forgot', {
        client: req.client
    });
});

router.get('/reset/:token', function (req, res) {
    Client.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function (err, client) {
        console.log(client);
        if (!client) {
            req.flash('error', 'Passwort reset token ist ungültig oder ist abgelaufen. Fordern Sie erneut eine Email an');
            return res.redirect('/clientRegister');
        }
        var y = false;
        var z = false;
        pwd = 'Geben Sie ein Passwort ein';
        pwd2 = 'Bestätigen Sie das Passwort';
        res.render('reset', {
            Client: req.cient,
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
                Client.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function (err, client, next) {
                    if (!client) {
                        console.log('no user ')
                        req.flash('error', 'Passwort reset token ist ungültig oder ist abgelaufen. Fordern Sie erneut eine Email an');
                        return res.redirect('back');
                    }
                    client.password = req.body.new_pwd;
                    client.resetPasswordToken = undefined;
                    user.resetPasswordExpires = undefined;
                    console.log('passwort' + client.password + 'and the user is' + client)

                    client.save(function (err) {
                        if (err) {
                            console.log('usr not saved ')
                            return res.redirect('back');
                        } else {
                            console.log('saved also einloggen')
                            req.logIn(client, function (err) {
                                done(err, client);
                            });

                        }
                    });
                });
            },

            function (client, done) {
                // console.log('got this far 4')
                var smtpTrans = nodemailer.createTransport({
                    service: 'Gmail',
                    auth: {
                        user: 'dittrich.yannick@gmail.com',
                        pass: 'Wh8sApp1993*/-'
                    }
                });
                var mailOptions = {
                    to: client.email,
                    from: 'info@silvering.ch',
                    subject: 'Ihr Passwort wurde geändert',
                    text: 'Guten Tag,\n\n' +
                        ' - Dies ist eine Bestätigung, dass Ihr Passwort für das Konto' + client.email + ' gerade geändert wurde.\n'
                };
                smtpTrans.sendMail(mailOptions, function (err) {
                    // req.flash('success', 'Success! Your password has been changed.');
                    console.log('sent confirmation');
                    done(err);
                });
            }
        ], function (err) {
            req.flash('success', 'Ihr Passwort wurde erfolgreich zurückgesetzt :)');
            res.redirect('/clientRegister');
        });
    }
});
module.exports = router;