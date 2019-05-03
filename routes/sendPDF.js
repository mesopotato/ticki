var PDF = require('../routes/generatePDF');
var nodemailer = require('nodemailer');

exports.sendPdfNow = function (result) {
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
    console.log('OBJ wird übergeben: ' + JSON.stringify(obj));
    console.log('doc definition soll sein  .:' + docDefinition);
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
                 */
                console.log('this obj' + obj);
                /* res.render('buyed', {
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