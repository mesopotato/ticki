var Event = require('../models/event');
var Ticket = require('../models/tickets');
var Eintritt = require('../models/eintritte');
var Order = require('../models/order');


exports.checkOrder = function (obj) {
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


exports.order = function (obj) {
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

exports.saveEintritte = function (obj, client) {
    return new Promise((resolve, reject) => {
        console.log('in save Eintritte');
        var expires = Date.now() + 3600000 + 3600000; // 1 hour
        var k = Object.keys(obj);
        var firstTicketID = obj[[0]];
        console.log('firstTicketID:')
        console.log(firstTicketID);
        Ticket.findById(firstTicketID, function (err, ticket){
            if (err){
                console.log('in err of find ticket by  id ');
                console.log(err);
            }
            console.log('ticket ist:')
            console.log(ticket);
            var newOrder = new Order({
                clientId: client.id,
                bezahlt: false,
                reservation: expires, 
                eventId: ticket.eventId
            })
            Order.saveOrder(newOrder, function (err, order) {
                if (err) {
                    reject(err);
                }
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
                    console.log('bestellung ist : ' + bestellung);
                    for (i = 0; i < bestellung; i++) {
                        console.log('for loope inner i ist = ' + i);
                        var newEintritt = new Eintritt({
                            abgebucht: false,
                            ticketId: ticketId,
                            orderId: order.id
                        })
                        Eintritt.saveEintritt(newEintritt, function (err, eintritt) {
                            if (err) {
                                reject(err);
                            } else {
                                dic[eintritt.id] = eintritt
                                console.log('save eintritt erfolgreich DIC : ' + dic);
                                gespeichert = gespeichert + 1;
                                console.log('gespeichert sind : ' + gespeichert);
                                console.log('gesamt sind : ' + gesamt);
                                if (gespeichert >= gesamt) {
                                    console.log('wird resolved!!!');
                                    console.log('dic ist in dem Moment: ' + Object.entries(dic));
                                    resolve(dic);
                                }
                            }
                        })
                    }
                }
            })
        })
        

    })
}

function cleanInt(x) {
    x = Number(x);
    return x >= 0 ? Math.floor(x) : Math.ceil(x);
}