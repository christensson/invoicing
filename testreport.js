var args = require('commander');
var reporter = require('./reporter.js');
var mydb = require('./mydb.js');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var defaults = require('./public/default.js').get();
var i18n = require('i18next');
var i18nFsBackend = require('i18next-node-fs-backend');
var Q = require('q');
var log = require('./log');

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

switch(args.verbose) {
  case undefined:
  case 0:
    break;
  case 1:
    log.level = 'verbose';
    break;
  case 2:
    log.level = 'debug';
    break;
  default:
  case 3:
    log.level = 'silly';
    break;
}
log.info("Log level is " + log.level);

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

log.info("Test report!");

var debug = false;
if (args.dbg) {
  debug = true;
  log.info("Debug mode enabled!");
}

if (!args.real_db) {
  log.info("Using local DB!");
  mydb.setLocalDb();
}

var demoMode = false;
if (args.demo) {
  demoMode = true;
  log.info("Demo mode enabled!");
}

var invoiceQuery = undefined;
if (args.invoice_id) {
  log.info("Going to render invoice with _id=" + args.invoice_id);
  var oinvoice_id = ObjectID(args.invoice_id);
  invoiceQuery = {'_id': oinvoice_id};
}

var tmpDir = __dirname + "/tmp";

i18nInitPromise = i18nInit();

renderInvoice = function(invoice) {
  if (invoice == undefined) {
    log.error("Invoice not found!");
    process.exit(1);
  } else {
    i18nInitPromise.then(function(t) {
      reporter.doInvoiceReport(invoice, tmpDir, function(reportFilename) {
        log.info("onCompletion: reportFilename=" + reportFilename);
        process.exit();
      }, args.output, demoMode, debug, args.verbose);
    }).fail(function(err) {
      log.error("ERROR: i18n.init: " + err);
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
    log.verbose("Invoice will be rendered from JSON: " + JSON.stringify(obj, null, 2));
    deferred.resolve(obj);
  });
  return deferred.promise;
};

Q().then(function() {
  if (args.json) {
    log.info("Get invoice data from JSON file: " + args.json);
    return getJsonFromFile(args.json);
  } else {
    log.info("Get invoice: " + JSON.stringify(invoiceQuery, null, 2));
    return mydb.getOneDocPromise('invoice', invoiceQuery);  
  }
}).then(function(invoice) {
  renderInvoice(invoice);
});

