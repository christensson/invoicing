var Report = require('fluentreports').Report;

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
  var detailsSummaryCustomTextFontSize = 9;
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
    var decimalSeparator = '.';
    var valueString = value.toString();
    var decimalSepPos = valueString.indexOf(decimalSeparator);
    if (-1 == decimalSepPos) {
      valueString = valueString + decimalSeparator + "00";
    } else {
      var numDecimals = valueString.length - decimalSepPos - 1;
      if (1 == numDecimals) {
        valueString = valueString + "0";
      } else {
        // Extract 2 decimals after decimal separator, +1 since not inclusive
        valueString = valueString.slice(0, decimalSepPos + 2 + 1);
      }
    }
    return valueString + " " + currencyString;
  };

  var calcPaymentAdjustment = function(amount) {
    var amountRounded = Math.round(amount);
    var adjustment = amountRounded - amount;
    var adjustedAmount = amount + adjustment;
    console.log("calcPaymentAdjustment: amount=" + amount + ", adjAmount=" + adjustedAmount + ", adjustment=" + adjustment);
    return adjustment;
  };
  
  var formatDate = function(value) {
    var date = new Date(value);
    var isoDateString = date.toISOString();
    return isoDateString.split("T")[0];
  };
  
  var formatTextTemplate = function(text, cust) {
    var formatedText = text;
    if (cust.vatNr !== undefined) {
      formatedText = formatedText.replace("%c.vatNr%", cust.vatNr);
    }
    if (debug) {
      console.log("formatTextTemplate(): Formated text: " + formatedText);
    }
    return formatedText;
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
    var companyDetailsColSize = [150, 150, 150, 150];
    var c = invoice.company;
    x.band( [
             {data: "Adress", width: companyDetailsColSize[0], align: x.left, fontSize: companyDetailsHeaderFontSize},
             {data: c.contact1Caption, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsHeaderFontSize},
             {data: "Momsreg nr", width: companyDetailsColSize[2], align: x.left, fontSize: companyDetailsHeaderFontSize},
             {data: c.payment1Caption, width: companyDetailsColSize[3], align: x.left, fontSize: companyDetailsHeaderFontSize}
             ], {border: 0});
    x.band( [
             {data: c.name, width: companyDetailsColSize[0], align: x.left, fontSize: companyDetailsFontSize},
             {data: c.contact1, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsFontSize},
             {data: c.vatNr, width: companyDetailsColSize[2], align: x.left, fontSize: companyDetailsFontSize},
             {data: c.payment1, width: companyDetailsColSize[3], align: x.left, fontSize: companyDetailsPaymentFontSize, fontBold: true}
             ], {border: 0});
    x.band( [
             {data: c.addr1, width: companyDetailsColSize[0], align: x.left, fontSize: companyDetailsFontSize},
             {data: c.contact2Caption, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsHeaderFontSize},
             {data: "", width: companyDetailsColSize[2], align: x.left, fontSize: companyDetailsHeaderFontSize},
             {data: c.payment2Caption, width: companyDetailsColSize[3], align: x.left, fontSize: companyDetailsHeaderFontSize}
             ], {border: 0});
    x.band( [
             {data: c.addr2, width: companyDetailsColSize[0], align: x.left, fontSize: companyDetailsFontSize},
             {data: c.contact2, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsFontSize},
             {data: c.vatNrCustomText, width: companyDetailsColSize[2], align: x.left, fontSize: companyDetailsFontSize},
             {data: c.payment2, width: companyDetailsColSize[3], align: x.left, fontSize: companyDetailsPaymentFontSize, fontBold: true}
             ], {border: 0});
    if (c.addr3 || c.contact3 || c.paymentCustomText) {
      x.band( [
               {data: c.addr3, width: companyDetailsColSize[0], align: x.left, fontSize: companyDetailsFontSize},
               {data: c.contact3Caption, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsHeaderFontSize},
               {data: "", width: companyDetailsColSize[2], align: x.left, fontSize: companyDetailsHeaderFontSize},
               {data: "", width: companyDetailsColSize[3], align: x.left, fontSize: companyDetailsHeaderFontSize}
               ], {border: 0});
      x.band( [
               {data: "", width: companyDetailsColSize[0], align: x.left, fontSize: companyDetailsFontSize},
               {data: c.contact3, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsFontSize},
               {data: "", width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsFontSize},
               {data: c.paymentCustomText, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsFontSize}
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
    var totalVat = invoice.totalInclVat - invoice.totalExclVat;
    totalVat = parseFloat(totalVat.toFixed(2));
    var totalExclVat = invoice.totalExclVat;
    totalExclVat = parseFloat(totalExclVat.toFixed(2));
    var useReverseCharge = invoice.customer.useReverseCharge === true;
    var amountToPay = useReverseCharge?invoice.totalExclVat:invoice.totalInclVat;
    var amountToPayAdjustment = calcPaymentAdjustment(amountToPay);
    amountToPay = amountToPay + amountToPayAdjustment;
    x.fontSize(detailsSummaryFontSize);
    x.newLine();
    x.band( [
             {data: "Netto", width: 410, align: x.right},
             {data: formatCurrency(invoice.totalExclVat), width: 120, align: x.right}
           ], {fontBold: 0, border:0, width: 0, wrap: 1} );
    if (!useReverseCharge) {
      x.band( [
               {data: "Moms", width: 410, align: x.right},
               {data: formatCurrency(totalVat), width: 120, align: x.right}
             ], {fontBold: 0, border:0, width: 0, wrap: 1} );
    }
    x.band( [
             {data: "Öresutjämning", width: 410, align: x.right},
             {data: formatCurrency(amountToPayAdjustment), width: 120, align: x.right}
           ], {fontBold: 0, border:0, width: 0, wrap: 1} );
    x.band( [
             {data: "Att betala", width: 410, align: x.right},
             {data: formatCurrency(amountToPay), width: 120, align: x.right}
             ], {fontBold: 1, border:0, width: 0, wrap: 1} );
    if (useReverseCharge) {
      x.newLine();
      x.fontSize(detailsSummaryCustomTextFontSize);
    
      var reverseChargeText = formatTextTemplate(invoice.company.reverseChargeText, invoice.customer);
      x.print(reverseChargeText, {fontBold: 0, border: 0, wrap: 1});
    }
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
