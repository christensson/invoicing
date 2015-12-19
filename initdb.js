var mydb = require('./mydb.js');

console.log("Init database!");

var devMode = false;
if (process.argv.length == 3 && process.argv[2] == "-d") {
  console.log("Development mode enabled!");
  devMode = true;
}

mydb.init(devMode, function() {
  console.log("All done!");
  process.exit();
});
