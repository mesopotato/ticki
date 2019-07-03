var Event = require('../models/event');
var Ticket = require('../models/tickets');
var Eintritt = require('../models/eintritte');
var Order = require('../models/order');

exports.getOrders = function (client) {
    return new Promise((resolve, reject) => {
        try {
            var u = 0;
            var bestellungen = [];
            Order.getOrdersByClientId(client.id, function (err, orders) {
                if (err) {
                    console.log('error is thrown in get orders array');
                    console.log(err);
                    reject(err);
                }
                console.log('orders are :');
                console.log(orders);

                for (var key in orders) {
                    //lol let is creating a blocked scoped variable :) s
                    let order = orders[key];
                    console.log('key1');
                    console.log(order);
                    console.log('keyeventID');
                    console.log(order.evntId);

                    var added = order.reservation;
                    console.log('reservation??');
                    console.log(order.reservation);
                    var expiresIn = new Date(added);
                    expiresIn.setMinutes(added.getMinutes() + 30);
                    console.log('expires iN');
                    console.log(expiresIn);

                    var s = added.getSeconds();
                    var m = added.getMinutes();
                    var h = added.getHours();
                    var d = added.getDate();
                    var month = added.getMonth();
                    var y = added.getFullYear();

                    var sE = expiresIn.getSeconds();
                    var mE = expiresIn.getMinutes();
                    var hE = expiresIn.getHours();
                    var dE = expiresIn.getDate();
                    var monthE = expiresIn.getMonth();
                    var yE = expiresIn.getFullYear();

                    var addedTime = h + ':' + m + ':' + s + '   ' + d + '.' + month + '.' + y;
                    var expireTime = hE + ':' + mE + ':' + sE + '   ' + dE + '.' + monthE + '.' + yE;

                    // event = Event.findById(order.eventId);
                    // console.log('what is in event?')
                    // console.log(event);
                    Event.findById(order.eventId, function (err, event) {
                        if (err) {
                            console.log('error is thrown in find event orders array');
                            console.log(err);
                            reject(err);
                        }
                        console.log('key2');
                        console.log(order);

                        bestellungen.push({
                            head: {
                                orderId: order.id,
                                eventTitle: event.title,
                                veranstalter: event.veranstalter,
                                lokation: event.lokation,
                                orderAdded: addedTime,
                                expireTime: expireTime,
                            }
                        })
                        u = u + 1;
                        console.log('we had a push: head :')

                        console.log(Object.keys(bestellungen).length)

                        if (Object.keys(bestellungen).length >= Object.keys(orders).length) {
                           
                            console.log('resolving bestellungnen')
                            resolve(bestellungen)
                        }
                    })
                }

            })
        } catch (err) {
            console.log(err);
        }
    })
}

// var funcs = [];

// function createfunc(i) {
//   return function() {
//     console.log("My value: " + i);
//   };
// }

// for (var i = 0; i < 3; i++) {
//   funcs[i] = createfunc(i);
// }
exports.getEintrittePerOrder = function (order) {
    return new Promise((resolve, reject) => {
        var eintrittArray = [];
        console.log(order.head.orderId)

        Eintritt.getEintritteByOrder(order.head.orderId, function (err, eintritte) {
            if (err) {
                console.log(err);
                reject(err);
            }
            console.log('GGGIIIIVENNN BACKKKK UO ist ')
            console.log(eintritte);

            for (var key in eintritte) {
                console.log('in key eintritte u is:')

                let eintritt = eintritte[key];
                Ticket.getTicketById(eintritt.ticketId, function (err, ticket) {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }

                    //list.splice( 1, 0, "baz");
                    eintrittArray.push({
                        bestellung: {
                            orderId: eintritt.orderId,
                            eintrittId: eintritt.id,
                            ticketKategorie: ticket.kategorie,
                            datum: ticket.gueltig_datum,
                            preis: ticket.preis,
                        }
                    })

                    if (Object.keys(eintrittArray).length >= Object.keys(eintritte).length) {
                        resolve(eintrittArray);
                    }
                })
            }
        })
    })
}