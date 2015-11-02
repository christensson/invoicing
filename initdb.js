var mydb = require('./mydb.js');

mydb.init(function() {
  console.log("All done!");
  process.exit();
});
