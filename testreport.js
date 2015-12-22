var args = require('commander');
var reporter = require('./reporter.js');
var mydb = require('./mydb.js');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
Q = require('q');

args.version('0.0.1')
.option('--dbg', 'Debug mode enabled')
.option('--demo', 'Demo mode enabled')
.option('--real_db', 'Query real DB, not local development DB')
.parse(process.argv);

console.log("Init database!");

var debug = false;
if (args.dbg) {
  debug = true;
  console.log("Debug mode enabled!");
}

if (!args.real_db) {
  console.log("Using local DB!");
  mydb.setLocalDb();
}

var demoMode = false;
if (args.demo) {
  demoMode = true;
  console.log("Demo mode enabled!");
}
var tmpDir = __dirname + "/tmp";

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
    reporter.doInvoiceReport(invoice, tmpDir, function(reportFilename) {
      console.log("onCompletion: reportFilename=" + reportFilename);
      process.exit();
    }, demoMode, debug);
  }
});

