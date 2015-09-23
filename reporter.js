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
  
  var titleFontSize = 20;
  var customerAddressFontSize = 10;
  var headerDetailsFontSize = 8;
  var detailsFontSize = 10;
  var detailsSummaryFontSize = 10;
  var currencyString = "kr";
  
  var customerAddrX = 300;
  var customerAddrY = 80;
  
  var formatCurrency = function(value) {
    return value + " " + currencyString;
  };

  var mytitleheader = function(x) {
    x.print('Faktura', {fontSize: titleFontSize});

    x.fontSize(customerAddressFontSize);
    x.band([{data: invoice.customer.name, width: 150}], {x: customerAddrX, y: customerAddrY});
    x.band([{data: invoice.customer.addr1, width: 150}], {x: customerAddrX});
    x.band([{data: invoice.customer.addr2, width: 150}], {x: customerAddrX});
    x.band([{data: invoice.customer.addr3, width: 150}], {x: customerAddrX});

    mypageheader(x);
  };

  var mypageheader = function(x) {
    x.fontSize(headerDetailsFontSize);
    x.band([ {
      data : "Oss tillhandha:",
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

  var mypagefooter = function(x) {
    x.band( [
        {data: "Lätt Fakturering", width: x.maxX()/2, align: x.left},
        {data: "Sida " + x.currentPage(), width: x.maxX()/2 - 30, align: x.right}
        ], {border: 0, y: x.maxY()-15});
  };

  var detailsColSize = [230, 80, 100, 120];
  var detailsWidth = detailsColSize.reduce(function(a, b) { return a + b; });
  var invoiceDetailsHeader = function ( x, r ) {
    x.fontSize(detailsFontSize);
    //x.line(x.currentX(), x.currentY(), x.currentX() + detailsWidth, x.currentY());
    x.band( [
      {data: "Beskrivning", width: detailsColSize[0], align: x.left},
      {data: "Antal", width: detailsColSize[1], align: x.right},
      {data: "Pris", width: detailsColSize[2], align: x.right},
      {data: "Totalt", width: detailsColSize[3], align: x.right}
    ], {fontBold: 1, border:0, width: 0, wrap: 1} );
    x.bandLine(1);
  };

  var invoiceDetails = function ( x, r ) {
    x.fontSize(detailsFontSize);
    x.band( [
      {data: r.description, width: detailsColSize[0], align: x.left},
      {data: r.count, width: detailsColSize[1], align: x.right},
      {data: r.price, width: detailsColSize[2], align: x.right},
      {data: formatCurrency(r.total), width: detailsColSize[3], align: x.right}
    ], {border:0, width: 0, wrap: 1} );
  };

  var finalsummary = function(x, r) {
    x.fontSize(detailsSummaryFontSize);
    x.newLine();
    x.band( [
             {data: "Totalt exkl moms", width: 410, align: x.right},
             {data: formatCurrency(invoice.totalExclVat), width: 120, align: x.right}
           ], {fontBold: 0, border:0, width: 0, wrap: 1} );
    x.band( [
             {data: "Att betala", width: 410, align: x.right},
             {data: formatCurrency(invoice.totalInclVat), width: 120, align: x.right}
             ], {fontBold: 1, border:0, width: 0, wrap: 1} );
    x.newLine();
  };


  // You don't have to pass in a report name; it will default to "report.pdf"
  var reportName = "report.pdf";

  var rpt = new Report(reportName)
      .margins(30)
      .paper('A4')
      .titleHeader(mytitleheader)
      .pageHeader(mypageheader)
      .pageFooter(mypagefooter)
      //.header(myheader)
      .data(invoice.invoiceItems)   // REQUIRED
      //.count('cid')
      //.finalSummary( finalsummary )// bug: Does not work with pageFooter!
      //.userdata( {hi: 1} )// Optional 
      .detail(invoiceDetails) // Optional
      //.totalFormatter( totalFormatter ) // Optional
      .fontSize(10); // Optional

  rpt.groupBy('', {runHeader: rpt.newPageOnly})
    .header(invoiceDetailsHeader)
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
