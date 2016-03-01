var args = require('commander');
var mydb = require('./mydb.js');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var Q = require('q');

args.version('0.0.1')
.option('--dev', 'Init DB with development data')
.option('--real_db', 'Init real DB, not local development DB')
.option('--user_add_group_templ [id]', 'Add group templates to user')
.parse(process.argv);

console.log("Init database!");

var devMode = false;
if (args.dev) {
  devMode = true;
  console.log("Development mode enabled!");
}

if (!args.real_db) {
  console.log("Using local DB!");
  mydb.setLocalDb();
}

if (args.user_add_group_templ) {
  console.log("Going to add group templates to user with _id=" + args.user_add_group_templ);
  var ouser_id = ObjectID(args.user_add_group_templ);
  var userQuery = {'_id': ouser_id};
  mydb.initUserContext(userQuery, undefined, {initSettings: false, initTemplates: true}).then(function() {
    console.log("Success!");
    process.exit();
  }).fail(function() {
    console.log("Failure!");
    process.exit(1);
  });
} else {
  console.log("Full init of database!");
  mydb.init(devMode, function() {
    console.log("All done!");
    process.exit();
  });
}
