var express = require('express');
var router  = express.Router();

/* GET report listing. */
router.get('/', function(req, res) {
    res.render('resourceManagement', { title: 'Resource Management' });
});

module.exports = router;
