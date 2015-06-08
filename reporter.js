var Report = require('fluentreports').Report;

module.exports.doCustomersReport = function (customers, onCompletion) {
  'use strict';
  // customer: { _id, cid, name, addr1, addr2, phone, isValid}

  var mypageheader = function(x) {
    x.print('Customers', {fontSize: 20});
    x.newLine();
  };

  var mypagefooter = function(x) {
    x.band( [
        {data: "Lätt Fakturering", width: x.maxX()/2, align: x.left},
        {data: "Page " + x.currentPage(), width: x.maxX()/2 - 30, align: x.right}
        ], {border: 0, y: x.maxY()-15});
  };

  var custheader = function ( x, r ) {
    x.band( [
      {data: "ID", width: 30, align: x.left},
      {data: "Name", width: 120},
      {data: "Address", width: 150},
      {data: "Phone", width: 100}
    ], {fontBold: 1, border:1, width: 0, wrap: 1} );
  };

  var custdetail = function ( x, r ) {
    x.band( [
      {data: r.cid, width: 30, align: x.left},
      {data: r.name, width: 120},
      {data: r.addr1 + "\n" + r.addr2, width: 150},
      {data: r.phone, width: 100}
    ], {border:1, width: 0, wrap: 1} );
  };
/*
  var namefooter = function ( report, data, state ) {
    report.band( [
      ["Totals for " + data.name, 180],
      [report.totals.hours, 100, 3]
    ] );
    report.newLine();
  };
*/

/*
  var weekdetail = function ( report, data ) {
    // We could do this -->  report.setCurrentY(report.getCurrentY()+2);   Or use the shortcut below of addY: 2
    report.print( ["Week Number: " + data.week], {x: 100, addY: 2} );
  };
*/
  var totalFormatter = function(data, callback) {
   // if (data.hours) { data.hours = ': ' + data.hours; }
    callback(null, data);
  };

  var finalsummary = function(x, r) {
    x.newLine();
    x.bandLine(1);
    x.newLine();
    x.print(
        "Total number of customers is " + x.totals.cid); 
    x.newLine();
    x.bandLine(1);
  }


  // You don't have to pass in a report name; it will default to "report.pdf"
  var reportName = "report.pdf";

  var rpt = new Report(reportName)
      .margins(30)
      .paper('A4')
      .data( customers )   // REQUIRED
      .pageHeader(mypageheader)
      .pageFooter(mypagefooter)
      //.count('cid')
      //.finalSummary( finalsummary )// bug: Does not work with pageFooter!
      //.userdata( {hi: 1} )// Optional 
      .detail( custdetail ) // Optional
      //.totalFormatter( totalFormatter ) // Optional
      .fontSize(10); // Optional

  rpt.groupBy('')
    .header(custheader)
    .count('cid')
    .footer(finalsummary);



  // Debug output is always nice (Optional, to help you see the structure)
  rpt.printStructure();


  // This does the MAGIC...  :-)
  console.time("Rendered");
  var a = rpt.render(function(err, name) {
      console.timeEnd("Rendered");
      if (err) {
          console.error("Report had an error",err);
      } else {
        console.log("Report is named:",name);
        onCompletion(name);
      }
  });

}
