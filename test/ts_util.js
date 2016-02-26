// load Unit.js module
var test = require('unit.js');

var util = require('../public/util.js');

test
  .case('dateAddDays', function() {
    var now = new Date();
    test.assert(util.dateAddDays(now, 0).valueOf() === now.valueOf());
  })
  .case('calcPaymentAdjustment', function() {
    test.assert(util.calcPaymentAdjustment(100) === 0);
    test.assert(util.calcPaymentAdjustment(100.5) === 0.5);
    test.assert(util.calcPaymentAdjustment(100.4) === -0.4);
    test.assert(util.calcPaymentAdjustment(100.1) === -0.1);
    test.assert(util.calcPaymentAdjustment(100.5) === 0.4);
  })
