var express = require('express');
var router = express.Router();
var multer = require('multer');

var Event = require('../models/event');


router.get('/getEvents', function (req, res) {
    Event.getEvents(function (err, events) {
        if (err) {
            console.log('err !!!!!!!!!!!!: ' + err);
        }
        console.log('events sind : ' + events);
        res.send( {
            events: events
        });
    });
 
});



module.exports = router;