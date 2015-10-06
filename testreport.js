var reporter = require('./reporter.js');
var mydb = require('./mydb.js');

function myFailureHandler(err) {
  console.error('ERROR: ' + JSON.stringify(err));
  process.exit(1);
}

var uid = "55f9ca518313c3441a9a506e";
var invoiceId = "56004ab92014ee1e1451d4ee";
var debug = false;
if (process.argv.length == 3 && process.argv[2] == "-d") {
  console.log("Debug mode enabled!");
  debug = true;
}

mydb.getInvoice(uid, invoiceId).then(function(invoice) {
  reporter.doInvoiceReport(invoice, function(reportFilename) {
    console.log("onCompletion: reportFilename=" + reportFilename);
    process.exit();
  }, debug);
}).fail(myFailureHandler);

