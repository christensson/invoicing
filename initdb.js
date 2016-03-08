var args = require('commander');
var mydb = require('./mydb.js');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var Q = require('q');
var log = require('./log');

function increaseVerbosity(v, total) {
  return total + 1;
}

args.version('0.0.1')
.option('--dev', 'Init DB with development data')
.option('--real_db', 'Init real DB, not local development DB')
.option('--user_add_group_templ [id]', 'Add group templates to user')
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

log.info("Init database!");

var devMode = false;
if (args.dev) {
  devMode = true;
  log.info("Development mode enabled!");
}

if (!args.real_db) {
  log.info("Using local DB!");
  mydb.setLocalDb();
}

if (args.user_add_group_templ) {
  log.info("Going to add group templates to user with _id=" + args.user_add_group_templ);
  var ouser_id = ObjectID(args.user_add_group_templ);
  var userQuery = {'_id': ouser_id};
  mydb.initUserContext(userQuery, undefined, {initSettings: false, initTemplates: true}).then(function() {
    log.info("Success!");
    process.exit();
  }).fail(function() {
    log.error("Failure!");
    process.exit(1);
  });
} else {
  log.info("Full init of database!");
  mydb.init(devMode, function() {
    log.info("All done!");
    process.exit();
  });
}
