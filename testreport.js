var reporter = require('./reporter.js');
var mydb = require('./mydb.js');

mydb.getCustomers(function (customers) {
    reporter.doCustomersReport(customers, function(reportFilename) {
        console.log("done");
    });
});
