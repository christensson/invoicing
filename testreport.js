var reporter = require('./reporter.js');
var mydb = require('./mydb.js');
var ObjectID = mongodb.ObjectID;
Q = require('q');

var debug = false;
if (process.argv.length == 3 && process.argv[2] == "-d") {
  console.log("Debug mode enabled!");
  debug = true;
}

var demoMode = true;

var uid = undefined;
mydb.getUser({'username-local': 'test'}).then(function(user) {
  uid = ObjectID(user._id);
  console.log("Got user uid=" + uid);
  return Q();
}).then(function() {
  var invoiceQuery = {'uid': uid, 'iid': 101};
  console.log("Get invoice: " + JSON.stringify(invoiceQuery));
  return mydb.getOneDocPromise('invoice', invoiceQuery);  
}).then(function(invoice) {
  if (invoice == undefined) {
    console.error("Invoice not found!");
    process.exit(1);
  } else {
    reporter.doInvoiceReport(invoice, function(reportFilename) {
      console.log("onCompletion: reportFilename=" + reportFilename);
      process.exit();
    }, demoMode, debug);
  }
});

