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
    test.assert(util.calcPaymentAdjustment(100.5) === 0.5);
    test.assert(util.calcPaymentAdjustment(100.51) === 0.49);
    test.assert(util.calcPaymentAdjustment(100.50) === 0.50);
    test.assert(util.calcPaymentAdjustment(100.49) === -0.49);

    var opt = {numDec: 1};
    test.assert(util.calcPaymentAdjustment(100.450, opt) === 0.05);
    test.assert(util.calcPaymentAdjustment(100.449, opt) === -0.049);

    opt = {numDec: 2};
    test.assert(util.calcPaymentAdjustment(100.444, opt) === -0.004);
    test.assert(util.calcPaymentAdjustment(100.005, opt) === 0.005);
  })
  .case('formatNumber', function() {
    var opt;
    opt = {decimalSep: ',', thousandSep:' ', numDecimalTrunc: 2, zeroFill: false};
    test.assert(util.formatNumber(1000, opt) === "1 000");
    test.assert(util.formatNumber(1000.001999, opt) === "1 000,00");
    test.assert(util.formatNumber(1000.00999, opt) === "1 000,00");
    test.assert(util.formatNumber(1000.9, opt) === "1 000,9");
    test.assert(util.formatNumber(1000.1, opt) === "1 000,1");
    test.assert(util.formatNumber(1000.19, opt) === "1 000,19");

    opt = {decimalSep: ',', thousandSep:' ', numDecimalTrunc: 2, zeroFill: true};
    test.assert(util.formatNumber(1000, opt) === "1 000,00");
    test.assert(util.formatNumber(1000.001999, opt) === "1 000,00");
    test.assert(util.formatNumber(1000.00999, opt) === "1 000,00");
    test.assert(util.formatNumber(1000.9, opt) === "1 000,90");

    opt = {decimalSep: ',', thousandSep:' ', numDecimalTrunc: 3, zeroFill: true};
    test.assert(util.formatNumber(1000.001, opt) === "1 000,001");
    test.assert(util.formatNumber(1000.001999, opt) === "1 000,001");
    test.assert(util.formatNumber(1000.101999, opt) === "1 000,101");
  })
  .case('formatTextTemplate', function() {
    var text = "Hello %c.name%!\nYour VAT nr is %c.vatNr%.\n\nRegards %u.name%";
    var data = [
      {
        objId: "c",
        allowedFields: [
          "name", "addr1", "addr2", "addr3", "vatNr"
        ],
        data: {
          name: "Per Persson",
          addr1: "Storgatan 4",
          addr2: "123 43 Mönsterås",
          addr3: "",
          vatNr: "SE1131231232101"
        }
      },
      {
        objId: "u",
        allowedFields: [
          "name",
        ],
        data: {
          name: "Marcus",
        }
      }
    ];
    var textOut = util.formatTextTemplate(text, data);
    console.log("-------\nIn:\n" + text);
    console.log("-------\nOut:\n" + textOut);
  })


