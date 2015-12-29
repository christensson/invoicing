var Report = require('fluentreports').Report;
var fs = require('fs');
var util = require('./public/util.js');
var i18n = require('i18next');

module.exports.doInvoiceReport = function (invoice, tmpDir, onCompletion, isDemoMode, debug) {
  'use strict';
  isDemoMode = typeof isDemoMode !== 'undefined' ? isDemoMode : false;
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
  var companyDetailsPaymentFocusFontSize = 10;
  var pageNumberFontSize = 8;
  var headerDetailsCaptionFontSize = 7;
  var headerDetailsFontSize = 8;
  var detailsFontSize = 10;
  var detailsSummaryFontSize = 10;
  var detailsSummaryCustomTextFontSize = 9;
  var detailsRowSpacing = 3;
  var margin = 30;
  var pageFooterYOffset = -85;
  
  var headerStringX = 345;
  var headerStringY = 30;
  var headerStringWidth = 200;
  
  var demoStringX = 345;
  var demoStringY = 60;

  var customerAddrX = 345;
  var customerAddrY = 100;
  var customerAddrWidth = 200;
  
  var companyLogoX = 30;
  var companyLogoY = 30;
  var companyLogoWidth = 300;
  var companyLogoHeight = 120;

  var companyNameX = 0;
  var companyNameY = 160;
  var companyNameWidth = 330;
  
  var demoModeBgImg = "img/invoice_demo.png";
  var demoModeBgW = 442;
  var demoModeBgH = 442;
  var debugBorderWidth = debug?0.5:0;

  var calcPaymentAdjustment = function(amount) {
    var amountRounded = Math.round(amount);
    var adjustment = amountRounded - amount;
    var adjustedAmount = amount + adjustment;
    console.log("calcPaymentAdjustment: amount=" + amount + ", adjAmount=" + adjustedAmount + ", adjustment=" + adjustment);
    return adjustment;
  };
  
  var formatDate = function(value) {
    var dateStr = "";
    if (value !== undefined) {
      var date = new Date(value);
      console.log("Date: " + date.toString());
      var isoDateString = date.toISOString();
      dateStr = isoDateString.split("T")[0];
    }
    return dateStr;
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
    x.band([{data: headerString, width: headerStringWidth, fontSize: titleFontSize, fontBold: true}], {x: headerStringX, y: headerStringY, border: debugBorderWidth});
    
    x.band([{data: "Kund", width: customerAddrWidth, fontSize: customerAddressCaptionFontSize}], {x: customerAddrX, y: customerAddrY});
    x.fontSize(customerAddressFontSize);
    x.band([{data: invoice.customer.name, width: customerAddrWidth}],
        {x: customerAddrX, y: customerAddrY + 20, border: debugBorderWidth});
    x.band([{data: invoice.customer.addr1, width: customerAddrWidth}], {x: customerAddrX, border: debugBorderWidth});
    x.band([{data: invoice.customer.addr2, width: customerAddrWidth}], {x: customerAddrX, border: debugBorderWidth});
    x.band([{data: invoice.customer.addr3, width: customerAddrWidth}], {x: customerAddrX, border: debugBorderWidth});
    
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
    x.band([{data: invoice.company.name, width: companyNameWidth, fontSize: companyNameFontSize, fontBold: true}],
        {border: debugBorderWidth});

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
    if (invoice.projId !== undefined && invoice.projId.length > 0) {
      headerList.push({cap: "Projektnr", data: invoice.projId, colSize: 100});
    }
    if (invoice.ourRef !== undefined && invoice.ourRef.length > 0) {
      headerList.push({cap: "Vår referens", data: invoice.ourRef, colSize: 100});
    }
    if (invoice.yourRef !== undefined && invoice.yourRef.length > 0) {
      headerList.push({cap: "Er referens", data: invoice.yourRef, colSize: 100});
    }
    
    var captionList = [];
    var dataList = [];
    for (var i = 0; i < headerList.length; i++) {
      captionList.push({data: headerList[i].cap, width: headerList[i].colSize, align: x.left});
      dataList.push({data: headerList[i].data, width: headerList[i].colSize, align: x.left, fontBold: headerList[i].isBold});
    }
    x.band(captionList, {
      fontBold : 0,
      border : debugBorderWidth,
      width : 0,
      wrap : 1
    });
    x.fontSize(headerDetailsFontSize);
    x.band(dataList, {
      fontBold : 0,
      border : debugBorderWidth,
      width : 0,
      wrap : 1
    });
    x.newLine();

    if (isDemoMode) {
      x.image(demoModeBgImg, {
        x: (x.maxX() / 2) - (demoModeBgW/2) + margin/2,
        y: (x.maxY() / 2) - (demoModeBgH/2) + margin/2,
        align: "left", fit: [demoModeBgW, demoModeBgH]});
    }
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
    var companyDetailsColSize = [150, 140, 120, 150];
    var c = invoice.company;
    var hasExtraBand = false;
    var col1 = {
        cap: "Adress",
        text: [c.name, c.addr1, c.addr2, c.addr3]
    };
    if (c.addr3 !== undefined && c.addr3.length > 0) {
      hasExtraBand = true;
    }

    var col2 = [{cap: c.contact1Caption, text: c.contact1},
                {cap: c.contact2Caption, text: c.contact2},
                {cap: c.contact3Caption, text: c.contact3}];
    if (c.contact3 !== undefined && c.contact3.length > 0) {
      hasExtraBand = true;
    }

    var col3 = [{cap: "Momsreg nr", text: c.vatNr}];
    if (c.orgNr !== undefined && c.orgNr.length > 0) {
      col3.push({cap: "Organisationsnr", text: c.orgNr});
      hasExtraBand = true;
    }
    col3.push({cap: "", text: c.vatNrCustomText});
    // Add dummy to always have at least three items
    col3.push({cap: "", text: ""});

    var col4 = [{cap: c.payment1Caption, text: c.payment1, focus: c.paymentFocus === "1"},
                {cap: c.payment2Caption, text: c.payment2, focus: c.paymentFocus === "2"},
                {cap: c.payment3Caption, text: c.payment3, focus: c.paymentFocus === "3"}];
    if (c.payment3 !== undefined && c.payment3.length > 0) {
      hasExtraBand = true;
    }

    x.band( [
             {data: col1.cap, width: companyDetailsColSize[0], align: x.left, fontSize: companyDetailsHeaderFontSize},
             {data: col2[0].cap, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsHeaderFontSize},
             {data: col3[0].cap, width: companyDetailsColSize[2], align: x.left, fontSize: companyDetailsHeaderFontSize},
             {data: col4[0].cap, width: companyDetailsColSize[3], align: x.left, fontSize: companyDetailsHeaderFontSize}
             ], {border: debugBorderWidth});
    x.band( [
             {data: col1.text[0], width: companyDetailsColSize[0], align: x.left, fontSize: companyDetailsFontSize},
             {data: col2[0].text, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsFontSize},
             {data: col3[0].text, width: companyDetailsColSize[2], align: x.left, fontSize: companyDetailsFontSize},
             {data: col4[0].text, width: companyDetailsColSize[3], align: x.left,
               fontSize: col4[0].focus?companyDetailsPaymentFocusFontSize:companyDetailsPaymentFontSize,
               fontBold: col4[0].focus}
             ], {border: debugBorderWidth});
    x.band( [
             {data: col1.text[1], width: companyDetailsColSize[0], align: x.left, fontSize: companyDetailsFontSize},
             {data: col2[1].cap, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsHeaderFontSize},
             {data: col3[1].cap, width: companyDetailsColSize[2], align: x.left, fontSize: companyDetailsHeaderFontSize},
             {data: col4[1].cap, width: companyDetailsColSize[3], align: x.left, fontSize: companyDetailsHeaderFontSize}
             ], {border: debugBorderWidth});
    x.band( [
             {data: col1.text[2], width: companyDetailsColSize[0], align: x.left, fontSize: companyDetailsFontSize},
             {data: col2[1].text, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsFontSize},
             {data: col3[1].text, width: companyDetailsColSize[2], align: x.left, fontSize: companyDetailsFontSize},
             {data: col4[1].text, width: companyDetailsColSize[3], align: x.left,
               fontSize: col4[1].focus?companyDetailsPaymentFocusFontSize:companyDetailsPaymentFontSize,
               fontBold: col4[1].focus}
             ], {border: debugBorderWidth});
    if (hasExtraBand) {
      x.band( [
               {data: col1.text[3], width: companyDetailsColSize[0], align: x.left, fontSize: companyDetailsFontSize},
               {data: col2[2].cap, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsHeaderFontSize},
               {data: col3[2].cap, width: companyDetailsColSize[2], align: x.left, fontSize: companyDetailsHeaderFontSize},
               {data: col4[2].cap, width: companyDetailsColSize[3], align: x.left, fontSize: companyDetailsHeaderFontSize}
               ], {border: debugBorderWidth});
      x.band( [
               {data: "", width: companyDetailsColSize[0], align: x.left, fontSize: companyDetailsFontSize},
               {data: col2[2].text, width: companyDetailsColSize[1], align: x.left, fontSize: companyDetailsFontSize},
               {data: col3[2].text, width: companyDetailsColSize[2], align: x.left, fontSize: companyDetailsFontSize},
               {data: col4[2].text, width: companyDetailsColSize[3], align: x.left,
                 fontSize: col4[2].focus?companyDetailsPaymentFocusFontSize:companyDetailsPaymentFontSize,
                 fontBold: col4[2].focus}
               ], {border: debugBorderWidth});
    }
    x.addY(6);
    x.band( [
        {data: "Lätt Fakturering", width: x.maxX()/2, align: x.left, fontSize: brandFontSize},
        {data: "Sida " + x.currentPage(), width: x.maxX()/2 - margin, align: x.right, fontSize: pageNumberFontSize}
        ], {border: debugBorderWidth});
  };

  var detailsColSize = [200, 40, 80, 50, 50, 110];
  var detailsWidth = detailsColSize.reduce(function(a, b) { return a + b; });
  var invoiceDetailsHeader = function ( x, r ) {
    x.fontSize(detailsFontSize);
    //x.line(x.getCurrentX(), x.getCurrentY(), x.getCurrentX() + detailsWidth, x.getCurrentY());
    x.band( [
      {data: "Beskrivning", width: detailsColSize[0], align: x.left},
      {data: "Antal", width: detailsColSize[1], align: x.right},
      {data: "Á-pris", width: detailsColSize[2], align: x.right},
      {data: "Rabatt", width: detailsColSize[3], align: x.right},
      {data: "Moms", width: detailsColSize[4], align: x.right},
      {data: "Totalt", width: detailsColSize[5], align: x.right}
    ], {fontBold: 1, border:debugBorderWidth, width: 0, wrap: 1} );
    x.bandLine(1);
  };

  var invoiceDetails = function ( x, r ) {
    if (r.isValid) {
      x.fontSize(detailsFontSize);
      x.band( [
        {data: r.description, width: detailsColSize[0], align: x.left},
        {data: r.count, width: detailsColSize[1], align: x.right},
        {data: util.formatCurrency(r.price, invoice.currency), width: detailsColSize[2], align: x.right},
        {data: r.discount + '%', width: detailsColSize[3], align: x.right},
        {data: r.vat + '%', width: detailsColSize[4], align: x.right},
        {data: util.formatCurrency(r.total, invoice.currency), width: detailsColSize[5], align: x.right}
      ], {border:0, addY: detailsRowSpacing, width: 0, wrap: 1} );
    }
  };

  var finalsummary = function(x, r) {
    var company = invoice.company;
    var cust = invoice.customer;
    var totalExclVat = invoice.totalExclVat;
    var totalVat = invoice.totalInclVat - totalExclVat;
    totalVat = parseFloat(totalVat.toFixed(2));
    totalExclVat = parseFloat(totalExclVat.toFixed(2));
    var useReverseCharge = cust.useReverseCharge === true;
    var amountToPay = useReverseCharge?invoice.totalExclVat:invoice.totalInclVat;
    var amountToPayAdjustment = calcPaymentAdjustment(amountToPay);
    amountToPay = amountToPay + amountToPayAdjustment;
    x.fontSize(detailsSummaryFontSize);
    x.newLine();
    x.band( [
             {data: "Netto", width: 410, align: x.right},
             {data: util.formatCurrency(invoice.totalExclVat, invoice.currency), width: 120, align: x.right}
           ], {fontBold: 0, border:0, width: 0, wrap: 1} );
    if (!useReverseCharge) {
      x.band( [
               {data: "Moms", width: 410, align: x.right},
               {data: util.formatCurrency(totalVat, invoice.currency), width: 120, align: x.right}
             ], {fontBold: 0, border:0, width: 0, wrap: 1} );
    }
    x.band( [
             {data: "Öresutjämning", width: 410, align: x.right},
             {data: util.formatCurrency(amountToPayAdjustment, invoice.currency), width: 120, align: x.right}
           ], {fontBold: 0, border:0, width: 0, wrap: 1} );
    x.band( [
             {data: "Att betala", width: 410, align: x.right},
             {data: util.formatCurrency(amountToPay, invoice.currency), width: 120, align: x.right}
             ], {fontBold: 1, border:0, width: 0, wrap: 1} );
    if (useReverseCharge) {
      x.newLine();
      x.fontSize(detailsSummaryCustomTextFontSize);
    
      var reverseChargeText = formatTextTemplate(company.reverseChargeText, cust);
      x.print(reverseChargeText, {fontBold: 0, border: 0, wrap: 1});
    }
    if (company.paymentCustomText) {
      x.newLine();
      x.fontSize(detailsSummaryCustomTextFontSize);
      x.print(company.paymentCustomText, {fontBold: 0, border: 0, wrap: 1});
    }
  };


  // You don't have to pass in a report name; it will default to "report.pdf"
  var reportName = i18n.t('app.invoiceReport.fileName', {'cid': invoice.customer.cid, 'iid': invoice.iid});
  if (reportName === "") {
    reportName = "report.pdf";
  }
  
  // companyId makes directory unique
  var companyId = invoice.company._id;
  var reportDir = tmpDir + "/" + companyId;
  console.log("Report name: " + reportName + " (dir=" + reportDir + ")");
  if (!fs.existsSync(reportDir)) {
    console.log("Created dir: " + reportDir);
    fs.mkdirSync(reportDir);
  }
  //TODO: Cleanup old reports 
  var reportPath = reportDir + "/" + reportName;
  var rpt = new Report(reportPath)
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
  rpt.render(function(err, name) {
      console.timeEnd("Rendered");
      if (err) {
          console.error("Report had an error",err);
      } else {
        console.log("Report is named:",name);
        onCompletion(name);
      }
  });

};
