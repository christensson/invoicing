var args = require('commander');
var reporter = require('./reporter.js');
var mydb = require('./mydb.js');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var defaults = require('./public/default.js').get();
var i18n = require('i18next');
var i18nFsBackend = require('i18next-node-fs-backend');
Q = require('q');

function increaseVerbosity(v, total) {
  return total + 1;
}

args.version('0.0.1')
.option('--dbg', 'Debug mode enabled')
.option('--invoice_id [id]', 'Invoice id')
.option('--json [file]', 'Render invoice from JSON file')
.option('-o, --output [file]', 'Path to output PDF file')
.option('--demo', 'Demo mode enabled')
.option('--real_db', 'Query real DB, not local development DB')
.option('-v, --verbose', 'Be more verbose', increaseVerbosity, 0)
.parse(process.argv);

var i18nInit = function() {
  var deferred = Q.defer();
  // i18n
  i18n
  .use(i18nFsBackend)
  .init({
    lng: defaults.defaultLng,
    preload: defaults.enabledLngList.slice(0),
    whitelist: defaults.enabledLngList.slice(0),
    fallbackLng: defaults.defaultLng,
    saveMissing: false,
    backend: {
      // path where resources get loaded from
      loadPath: 'locales/{{lng}}/{{ns}}.json',

      // path to post missing resources
      addPath: 'locales/{{lng}}/{{ns}}.missing.json',

      // jsonIndent to use when storing json files
      jsonIndent: 2
    }
  }, function(err, t) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(t);
    }
  });
  return deferred.promise;
};

console.log("Test report!");

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

i18nInitPromise = i18nInit();

renderInvoice = function(invoice) {
  if (invoice == undefined) {
    console.error("Invoice not found!");
    process.exit(1);
  } else {
    i18nInitPromise.then(function(t) {
      reporter.doInvoiceReport(invoice, tmpDir, function(reportFilename) {
        console.log("onCompletion: reportFilename=" + reportFilename);
        process.exit();
      }, args.output, demoMode, debug, args.verbose);
    }).fail(function(err) {
      console.log("ERROR: i18n.init: " + err);
      process.exit(1);
    });
  }
};

getJsonFromFile = function(fileName) {
  var deferred = Q.defer();
  require('fs').readFile(fileName, 'utf8', function (err, data) {
    if (err) {
      deferred.reject(err);
      return;
    }
    var obj = JSON.parse(data);
    if (args.verbose > 0) {
      console.log("Invoice will be rendered from JSON: " + JSON.stringify(obj, null, 2));
    }
    deferred.resolve(obj);
  });
  return deferred.promise;
};

Q().then(function() {
  if (args.json) {
    console.log("Get invoice data from JSON file: " + args.json);
    return getJsonFromFile(args.json);
  } else {
    console.log("Get invoice: " + JSON.stringify(invoiceQuery, null, 2));
    return mydb.getOneDocPromise('invoice', invoiceQuery);  
  }
}).then(function(invoice) {
  renderInvoice(invoice);
});

