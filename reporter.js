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

module.exports.doInvoiceReport = function (invoice, onCompletion, debug) {
  'use strict';
  debug = typeof debug !== 'undefined' ? debug : false;
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
  
  var brandFontSize = 6;
  var titleFontSize = 22;
  var companyNameFontSize = 14;
  var customerAddressFontSize = 12;
  var customerAddressCaptionFontSize = 8;
  var companyDetailsHeaderFontSize = 6;
  var companyDetailsFontSize = 8;
  var companyDetailsPaymentFontSize = 8;
  var pageNumberFontSize = 8;
  var headerDetailsCaptionFontSize = 7;
  var headerDetailsFontSize = 8;
  var detailsFontSize = 10;
  var detailsSummaryFontSize = 10;
  var currencyString = "kr";
  var margin = 30;
  var pageFooterYOffset = -85;
  
  var headerStringX = 345;
  var headerStringY = 30;
  
  var customerAddrX = 345;
  var customerAddrY = 100;
  
  var companyLogoX = 30;
  var companyLogoY = 30;
  var companyLogoWidth = 300;
  var companyLogoHeight = 120;

  var companyNameX = 0;
  var companyNameY = 160;

  var formatCurrency = function(value) {
    return value + " " + currencyString;
  };
  
  var formatDate = function(value) {
    var date = new Date(value);
    var isoDateString = date.toISOString();
    return isoDateString.split("T")[0];
  };

  var mytitleheader = function(x) {
    var headerString = "FAKTURA";
    if (invoice.isCredit) {
      headerString = "KREDITFAKTURA";
    }
    x.band([{data: headerString, width: 400, fontSize: titleFontSize, fontBold: true}], {x: headerStringX, y: headerStringY});
    
    x.band([{data: "Kund", width: 150, fontSize: customerAddressCaptionFontSize}], {x: customerAddrX, y: customerAddrY});
    x.fontSize(customerAddressFontSize);
    x.band([{data: invoice.customer.name, width: 150}], {x: customerAddrX, y: customerAddrY + 20});
    x.band([{data: invoice.customer.addr1, width: 150}], {x: customerAddrX});
    x.band([{data: invoice.customer.addr2, width: 150}], {x: customerAddrX});
    x.band([{data: invoice.customer.addr3, width: 150}], {x: customerAddrX});
    
    if (invoice.company.logo !== undefined && invoice.company.logo.path !== undefined) {
      x.image(invoice.company.logo.path, {
        x: companyLogoX, y: companyLogoY, align: "left", fit: [companyLogoWidth, companyLogoHeight]});
      if (debug) {
        x.box(companyLogoX, companyLogoY, companyLogoX + companyLogoWidth, companyLogoY + companyLogoHeight);
      }
    } else {
      console.log("doInvoiceReport: No company logo configured for companyId=" + invoice.company._id);
    }

    x.setCurrentX(companyNameX);
    x.setCurrentY(companyNameY);
    x.band([{data: invoice.company.name, width: 200, fontSize: companyNameFontSize, fontBold: true}]);

    x.addY(10);
    
    mypageheader(x);
  };

  var mypageheader = function(x) {
    x.fontSize(headerDetailsCaptionFontSize);
    
    var headerList =
      [{cap: "Oss tillhandha senast", data: formatDate(invoice.lastPaymentDate), isBold : true, colSize: 80},
       {cap: "Fakturadatum", data: formatDate(invoice.date), colSize: 60},
       {cap: "Fakturanr", data: "" + invoice.iid, colSize: 40},
       {cap: "Kundnr", data: "" + invoice.customer.cid, colSize: 40}
       ];
    if (invoice.ourRef !== undefined && invoice.ourRef.length > 0) {
      headerList.push({cap: "Vår referens", data: invoice.ourRef, colSize: 80});
    }
    if (invoice.yourRef !== undefined && invoice.yourRef.length > 0) {
      headerList.push({cap: "Er referens", data: invoice.yourRef, colSize: 80});
    }
    
    var captionList = [];
    var dataList = [];
    for (var i = 0; i < headerList.length; i++) {
      captionList.push({data: headerList[i].cap, width: headerList[i].colSize, align: x.left});
      dataList.push({data: headerList[i].data, width: headerList[i].colSize, align: x.left, fontBold: headerList[i].isBold});
    }
    x.band(captionList, {
      fontBold : 0,
      border : 0,
      width : 0,
      wrap : 1
    });
    x.fontSize(headerDetailsFontSize);
    x.band(dataList, {
      fontBold : 0,
      border : 0,
      width : 0,
      wrap : 1
    });
    x.newLine();
  };

  var mypagefooter = function(x, r) {
    var footerY = x.maxY() + pageFooterYOffset;
    // Workaround since always setting Y doesn't work since details overlaps in that case...
    if (x.getCurrentY() < footerY) {
      x.setCurrentY(footerY);
    }
    x.addY(5);
    x.line(margin, x.getCurrentY(), x.maxX(), x.getCurrentY(), {thickness: 0.5});
    x.addY(3);
    var companyDetailsColSize = [200, 200, 200];
    var c = invoice.company;
    x.band( [
             {data: "Adress", width: companyDetailsColSize[0], align: x.left, fontSize: companyDetailsHeaderFontSize},
             {data: c.contact1Caption, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsHeaderFontSize},
             {data: c.payment1Caption, width: companyDetailsColSize[2], align: x.left, fontSize: companyDetailsHeaderFontSize}
             ], {border: 0});
    x.band( [
             {data: c.name, width: companyDetailsColSize[0], align: x.left, fontSize: companyDetailsFontSize},
             {data: c.contact1, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsFontSize},
             {data: c.payment1, width: companyDetailsColSize[2], align: x.left, fontSize: companyDetailsPaymentFontSize, fontBold: true}
             ], {border: 0});
    x.band( [
             {data: c.addr1, width: companyDetailsColSize[0], align: x.left, fontSize: companyDetailsFontSize},
             {data: c.contact2Caption, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsHeaderFontSize},
             {data: c.payment2Caption, width: companyDetailsColSize[2], align: x.left, fontSize: companyDetailsHeaderFontSize}
             ], {border: 0});
    x.band( [
             {data: c.addr2, width: companyDetailsColSize[0], align: x.left, fontSize: companyDetailsFontSize},
             {data: c.contact2, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsFontSize},
             {data: c.payment2, width: companyDetailsColSize[2], align: x.left, fontSize: companyDetailsPaymentFontSize, fontBold: true}
             ], {border: 0});
    if (c.addr3 || c.contact3) {
      x.band( [
               {data: c.addr3, width: companyDetailsColSize[0], align: x.left, fontSize: companyDetailsFontSize},
               {data: c.contact3Caption, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsHeaderFontSize}
               ], {border: 0});
      x.band( [
               {data: "", width: companyDetailsColSize[0], align: x.left, fontSize: companyDetailsFontSize},
               {data: c.contact3, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsFontSize}
               ], {border: 0});
    }
    x.addY(6);
    x.band( [
        {data: "Lätt Fakturering", width: x.maxX()/2, align: x.left, fontSize: brandFontSize},
        {data: "Sida " + x.currentPage(), width: x.maxX()/2 - margin, align: x.right, fontSize: pageNumberFontSize}
        ], {border: 0});
  };

  var detailsColSize = [230, 80, 100, 120];
  var detailsWidth = detailsColSize.reduce(function(a, b) { return a + b; });
  var invoiceDetailsHeader = function ( x, r ) {
    x.fontSize(detailsFontSize);
    //x.line(x.getCurrentX(), x.getCurrentY(), x.getCurrentX() + detailsWidth, x.getCurrentY());
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
      .margins(margin)
      .paper('A4')
      .titleHeader(mytitleheader)
      .pageHeader(mypageheader)
      .pageFooter(mypagefooter)
      .data(invoice.invoiceItems)   // REQUIRED
      .detail(invoiceDetails) // Optional
      .fontSize(10); // Optional

  rpt.groupBy('', {runHeader: rpt.newPageOnly})
    .footer(finalsummary)
    .header(invoiceDetailsHeader);
  


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
