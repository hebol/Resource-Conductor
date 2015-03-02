var express = require('express');
var router  = express.Router();

/* GET report listing. */
router.get('/', function(req, res, next) {
    res.render('time', { title: 'Time Control' });
});

module.exports = router;
