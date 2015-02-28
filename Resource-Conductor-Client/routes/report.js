var express = require('express');
var router  = express.Router();

/* GET report listing. */
router.get('/', function(req, res, next) {
  res.send('REPORT: not implemented');
});

module.exports = router;
