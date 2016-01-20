var args = require('commander');
var reporter = require('./reporter.js');
var mydb = require('./mydb.js');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
Q = require('q');

args.version('0.0.1')
.option('--dbg', 'Debug mode enabled')
.option('--invoice_id [id]', 'Invoice id')
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

var invoiceQuery = undefined;
if (args.invoice_id) {
  console.log("Going to render invoice with _id=" + args.invoice_id);
  var oinvoice_id = ObjectID(args.invoice_id);
  invoiceQuery = {'_id': oinvoice_id};
}

var tmpDir = __dirname + "/tmp";

var userPromise = Q();

if (invoiceQuery === undefined) {
  userPromise = mydb.getUser({'username-local': 'test'}).then(function(user) {
    uid = ObjectID(user._id);
    console.log("Got user uid=" + uid);
    invoiceQuery = {'uid': uid, 'iid': 101};
    return Q();
  });
}

userPromise.then(function() {
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

