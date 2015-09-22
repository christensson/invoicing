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
  };


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

};

module.exports.doInvoiceReport = function (invoice, onCompletion) {
  'use strict';
  /*  invoice: {
   *    _id, iid, uid, companyId, isLocked, isPaid, isValid
   *    customer:{
   *      _id, cid, uid, companyId, name, addr1, addr2, phone, isValid
   *    }
   *    yourRef, ourRef, date, daysUntilPayment, projId,
   *    invoiceItems:[
   *      {description, price, count, vat, discount, total, isValid}
   *    ]
   *    totalExclVat
   *    totalInclVat
   *  }
   * 
   */

  var mypageheader = function(x) {
    x.print('Faktura', {fontSize: 20});
    x.newLine();
    x.band([ {
      data : "Oss tillhandha senast:",
      width : 80,
      align : x.left,
    }, {
      data : "Fakturadatum:",
      width : 80,
      align : x.left
    }, {
      data : "Fakturanr:",
      width : 80,
      align : x.left
    }, {
      data : "Kundnr:",
      width : 80,
      align : x.left
    }, {
      data : "Vår referens:",
      width : 80,
      align : x.left
    }, {
      data : "Er referens:",
      width : 80,
      align : x.left
    } ], {
      fontBold : 0,
      border : 0,
      width : 0,
      wrap : 1
    });
    x.band([ {
      data : "" + invoice.date,
      width : 80,
      align : x.left
    }, {
      data : "" + invoice.date,
      width : 80,
      align : x.left
    }, {
      data : "" + invoice.iid,
      width : 80,
      align : x.left
    }, {
      data : "" + invoice.customer.cid,
      width : 80,
      align : x.left
    }, {
      data : "" + invoice.ourRef,
      width : 80,
      align : x.left
    }, {
      data : "" + invoice.yourRef,
      width : 80,
      align : x.left
    } ], {
      fontBold : 0,
      border : 0,
      width : 0,
      wrap : 1
    });
    x.newLine();
  };

  var header = function(x, data) {
    x.print('Invoice ' + invoice.iid, {fontSize: 20});
    x.newLine();
  };

  var mypagefooter = function(x) {
    x.band( [
        {data: "Lätt Fakturering", width: x.maxX()/2, align: x.left},
        {data: "Page " + x.currentPage(), width: x.maxX()/2 - 30, align: x.right}
        ], {border: 0, y: x.maxY()-15});
  };

  var invoiceDetailsHeader = function ( x, r ) {
    x.band( [
      {data: "Description", width: 150, align: x.left},
      {data: "Price", width: 80},
      {data: "Count", width: 80},
      {data: "Total", width: 100}
    ], {fontBold: 1, border:1, width: 0, wrap: 1} );
  };

  var invoiceDetails = function ( x, r ) {
    x.band( [
      {data: r.description, width: 150, align: x.left},
      {data: r.price, width: 80},
      {data: r.count, width: 80},
      {data: r.total, width: 100}
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
        "Total number of invoice details is " + x.totals.description); 
    x.newLine();
    x.bandLine(1);
  };


  // You don't have to pass in a report name; it will default to "report.pdf"
  var reportName = "report.pdf";

  var rpt = new Report(reportName)
      .margins(30)
      .paper('A4')
      .pageHeader(mypageheader)
      //.header(myheader)
      .pageFooter(mypagefooter)
      .data( invoice.invoiceItems )   // REQUIRED
      //.count('cid')
      //.finalSummary( finalsummary )// bug: Does not work with pageFooter!
      //.userdata( {hi: 1} )// Optional 
      .detail( invoiceDetails ) // Optional
      //.totalFormatter( totalFormatter ) // Optional
      .fontSize(10); // Optional

  rpt.groupBy('')
    .header(invoiceDetailsHeader)
    .count('description')
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

};
