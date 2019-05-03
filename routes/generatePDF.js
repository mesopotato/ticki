var Event = require('../models/event');
var Ticket = require('../models/tickets');
var Eintritt = require('../models/eintritte');
const pdfMakePrinter = require('pdfmake');


//pdf
exports.docDefinition = function (obj) {
    return new Promise((resolve, reject) => {
        console.log('doc definition');
        var content = [];
        var definition = [{
            header: 'Ihre Tickets',
            footer: {
                columns: [
                    'Left part',
                    { text: 'Right part', alignment: 'right' }
                ]
            },
            pageMargins: [40, 60, 40, 60],
            styles: {
                header: {
                    fontSize: 22,
                    bold: true
                },
                subheader: {
                    fontSize: 16,
                    bold: true
                },
                quote: {
                    italics: true
                },
                small: {
                    fontSize: 8
                }
            }
        }];
        var e = 0;
        console.log('obj ist :' + obj);
        for (var key in obj) {
            var eintrittId = key;
            console.log('im for loop');
            console.log('eintrittID ist: ' + eintrittId);
            Eintritt.getEintrittById(eintrittId, function (err, eintritt) {
                if (err) {
                    reject(err);
                } else {
                    Ticket.getTicketById(eintritt.ticketId, function (err, ticket) {
                        if (err) {
                            reject(err);
                        } else {
                            Event.getEventById(ticket.eventId, function (err, event) {
                                if (err) {
                                    reject(err);
                                } else {
                                    console.log('alles gefunden');
                                    content.push(
                                        { text: event.title },
                                        {
                                            text: event.veranstalter,

                                        },
                                        {
                                            alignment: 'justify',

                                            columns: [
                                                {
                                                    text: 'Lokation :' + event.lokation + '\n\n Ticket : ' + ticket.kategorie + '\n\n Datum : ' + ticket.gueltig_datum + '\n\n Beginn : ' + ticket.gueltig_time + '\n\n Türöffnung : ' + ticket.tueroeffnung + '\n\n Preis : ' + ticket.preis

                                                },
                                                { qr: 'https://localhost:3000/buchen/' + eintritt.id }
                                            ]
                                        },
                                        { text: 'Schöne Zeit', pageBreak: 'after' }
                                    );
                                    e = e + 1;
                                    console.log('E ist : ' + e);
                                    console.log('COntent ist : ' + Object.keys(content).length);
                                    console.log('definition ist : ' + definition);
                                    console.log('obj ist :' + Object.keys(obj).length);
                                    if (e >= Object.keys(obj).length) {
                                        content.pop()
                                        console.log('COntent ist : ' + content);
                                        const docDefinition111 = {
                                            header: 'Ihre Tickets',

                                            footer: {
                                                columns: [

                                                    { text: 'Right part', alignment: 'right' }
                                                    ,
                                                    {
                                                        text: 'Hftungsblenung zurückbehaltung blable etc etc',

                                                    }
                                                ]
                                            },
                                            pageMargins: [40, 60, 40, 60],

                                            content: content

                                        };
                                        //definition.push(content);
                                        console.log('definition ist : ' + JSON.stringify(docDefinition111));
                                        resolve(docDefinition111);
                                    }
                                }
                            })
                        }
                    })
                }
            })
        }
    })
}


exports.generatePdf = function (docDefinition, callback) {
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