var args = require('commander');
var mydb = require('./mydb.js');

args.version('0.0.1')
.option('--dev', 'Init DB with development data')
.option('--real_db', 'Init real DB, not local development DB')
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

mydb.init(devMode, function() {
  console.log("All done!");
  process.exit();
});
