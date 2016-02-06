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
  var style = {
    header: {
      fontSize: 22,
      font: "Helvetica",
    },
    subHeader: {
      fontSize: 20,
      font: "Helvetica",
    },
    companyName: {
      fontSize: 14,
      font: "Helvetica",
    },
    customerAddrCaption: {
      fontSize: 8,
      font: "Helvetica",
    },
    customerAddr: {
      fontSize: 12,
      font: "Times-Roman",
    },
    companyDetailsCaption: {
      fontSize: 6,
      font: "Helvetica",
    },
    companyDetails: {
      fontSize: 8,
      font: "Times-Roman",
    },
    companyDetailsPayment: {
      fontSize: 8,
      font: "Times-Roman",
    },
    companyDetailsPaymentFocus: {
      fontSize: 10,
      font: "Times-Roman",
    },
    footer: {
      font: "Helvetica",
      brand: {
        fontSize: 6,
      },
      pageNumber: {
        fontSize: 8,
      }
    },
    headerDetailsCaption: {
      fontSize: 7,
      font: "Helvetica",
    },
    headerDetails: {
      fontSize: 8,
      font: "Times-Roman",
    },
    details: {
      groupTitle: {
        fontSize: 12,
        font: "Helvetica",
      },
      header: {
        fontSize: 9,
        font: "Helvetica",
      },
      items: {
        fontSize: 9,
        font: "Times-Roman",
      },
      groupSummary: {
        fontSize: 9,
        caption: {
          bold: 0,
          font: "Helvetica",
        },
        value: {
          font: "Times-Roman",
        }
      },
    },
    summary: {
      fontSize: 10,
      font: "Times-Roman",
      caption: {
        font: "Helvetica",
        bold: 0,
      },
      value: {
        font: "Times-Roman",
      },
      customText: {
        fontSize: 9,
        font: "Times-Roman",
      }
    },
  };
  var companyDetailsColSize = [140, 140, 110, 150];
  var companyDetailsWidth = companyDetailsColSize.reduce(function(a, b) { return a + b; });
  var detailsGroupTitleTopPadding = 15;
  var detailsGroupHeaderTopPadding = 3;
  var detailsGroupHeaderFillColor = '#cccccc';
  var detailsGroupHeaderTopLineThickness = 0.5;
  var detailsGroupHeaderBottomLineThickness = 0.5;
  var detailsGroupSummaryTopPadding = 3;
  var detailsGroupSummaryBottomLineThickness = 0.5;
  var detailsBarsLineThickness = 0.5;
  var detailsSeparatorLineColor = '#cccccc';
  var detailsSeparatorLineThickness = 0.5;
  var summaryFontSize = 10;
  var summaryAmountToPayTopPadding = 5;
  var detailsRowSpacing = 3;
  var margin = 45;
  var pageFooterYOffset = -85;
  var pageFooterSeparatorLineThickness = 0.5;
  
  var headerStringX = 345;
  var headerStringY = 30;
  var headerStringWidth = 195;
  var subHeaderStringX = 345;
  var subHeaderStringY = 55;
  var subHeaderStringWidth = 190;
  
  var demoStringX = 345;
  var demoStringY = 60;

  var customerAddrX = 345;
  var customerAddrY = 100;
  var customerAddrWidth = 195;
  
  var companyLogoX = margin;
  var companyLogoY = 30;
  var companyLogoWidth = 285;
  var companyLogoHeight = 120;

  var companyNameX = 0;
  var companyNameY = 160;
  var companyNameWidth = 330;
  
  var demoModeBgImg = "img/invoice_demo.png";
  var demoModeBgW = 442;
  var demoModeBgH = 442;
  var debugBorderWidth = debug?0.5:0;

  var detailsColSize = [190, 60, 70, 50, 40, 110];
  var detailsWidth = detailsColSize.reduce(function(a, b) { return a + b; });

  var detailsSummaryValueColWidth = detailsColSize[detailsColSize.length - 1];
  var detailsSummaryCaptionColWidth = detailsWidth - detailsSummaryValueColWidth;

  var summaryValueColWidth = detailsSummaryValueColWidth;
  var summaryCaptionColWidth = detailsSummaryCaptionColWidth;

  var headerBottomY = 0;

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
    var subHeaderString = "";
    if (invoice.isCanceled) {
      subHeaderString = "*** MAKULERAD ***";
    }
    x.band([{data: headerString, width: headerStringWidth, fontSize: style.header.fontSize, fontBold: true}],
           {x: headerStringX, y: headerStringY, font: style.header.font, border: debugBorderWidth});
    if (subHeaderString.length > 0) {
      x.band([{data: subHeaderString, width: subHeaderStringWidth, fontSize: style.subHeader.fontSize, fontBold: true, fontItalic: true}],
             {x: subHeaderStringX, y: subHeaderStringY, font: style.subHeader.font, border: debugBorderWidth});
    }
    
    x.band([{data: "Kund", width: customerAddrWidth, fontSize: style.customerAddrCaption.fontSize}],
           {x: customerAddrX, y: customerAddrY, font: style.customerAddrCaption.font});
    x.fontSize(style.customerAddr.fontSize);
    x.font(style.customerAddr.font);
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
    x.band([{data: invoice.company.name, width: companyNameWidth, fontSize: style.companyName.fontSize, fontBold: true}],
        {font: style.companyName.font, border: debugBorderWidth});

    x.addY(10);
    
    mypageheader(x);
  };

  var mypageheader = function(x) {
    var headerList =
      [{cap: "Oss tillhanda senast", data: formatDate(invoice.lastPaymentDate), isBold: true, colSize: 80},
       {cap: "Fakturadatum", data: formatDate(invoice.date), isBold: false, colSize: 60},
       {cap: "Fakturanr", data: "" + invoice.iid, isBold: false, colSize: 40},
       {cap: "Kundnr", data: "" + invoice.customer.cid, isBold: false, colSize: 40}
       ];
    if (invoice.projId !== undefined && invoice.projId.length > 0) {
      headerList.push({cap: "Projektnr", data: invoice.projId, isBold: false, colSize: 100});
    }
    if (invoice.ourRef !== undefined && invoice.ourRef.length > 0) {
      headerList.push({cap: "Vår referens", data: invoice.ourRef, isBold: false, colSize: 100});
    }
    if (invoice.yourRef !== undefined && invoice.yourRef.length > 0) {
      headerList.push({cap: "Er referens", data: invoice.yourRef, isBold: false, colSize: 100});
    }
    
    var captionList = [];
    var dataList = [];
    for (var i = 0; i < headerList.length; i++) {
      captionList.push({data: headerList[i].cap, width: headerList[i].colSize, align: x.left});
      dataList.push({data: headerList[i].data, width: headerList[i].colSize, align: x.left, fontBold: headerList[i].isBold});
    }

    x.fontSize(style.headerDetailsCaption.fontSize);
    x.band(captionList, {
      font: style.headerDetailsCaption.font,
      border : debugBorderWidth,
      width : 0,
      wrap : 1
    });

    x.fontSize(style.headerDetails.fontSize);
    x.band(dataList, {
      font: style.headerDetails.font,
      border : debugBorderWidth,
      width : 0,
      wrap : 1
    });
    x.newLine();
    headerBottomY = x.getCurrentY();

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
    var footerLineMaxX = margin + detailsWidth - 1;
    x.line(margin, x.getCurrentY(), footerLineMaxX, x.getCurrentY(), {thickness: pageFooterSeparatorLineThickness});
    x.addY(3);
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
             {data: col1.cap, width: companyDetailsColSize[0], align: x.left, fontSize: style.companyDetailsCaption.fontSize, font: style.companyDetailsCaption.font},
             {data: col2[0].cap, width: companyDetailsColSize[1], align: x.left, fontSize: style.companyDetailsCaption.fontSize, font: style.companyDetailsCaption.font},
             {data: col3[0].cap, width: companyDetailsColSize[2], align: x.left, fontSize: style.companyDetailsCaption.fontSize, font: style.companyDetailsCaption.font},
             {data: col4[0].cap, width: companyDetailsColSize[3], align: x.left, fontSize: style.companyDetailsCaption.fontSize, font: style.companyDetailsCaption.font}
             ], {border: debugBorderWidth});
    x.band( [
             {data: col1.text[0], width: companyDetailsColSize[0], align: x.left, fontSize: style.companyDetails.fontSize, font: style.companyDetails.font},
             {data: col2[0].text, width: companyDetailsColSize[1], align: x.left, fontSize: style.companyDetails.fontSize, font: style.companyDetails.font},
             {data: col3[0].text, width: companyDetailsColSize[2], align: x.left, fontSize: style.companyDetails.fontSize, font: style.companyDetails.font},
             {data: col4[0].text, width: companyDetailsColSize[3], align: x.left,
               fontSize: col4[0].focus?style.companyDetailsPaymentFocus.fontSize:style.companyDetailsPayment.fontSize,
               fontBold: col4[0].focus,
               font: style.companyDetailsPayment.font}
             ], {border: debugBorderWidth});
    x.band( [
             {data: col1.text[1], width: companyDetailsColSize[0], align: x.left, fontSize: style.companyDetails.fontSize, font: style.companyDetails.font},
             {data: col2[1].cap, width: companyDetailsColSize[1], align: x.left, fontSize: style.companyDetailsCaption.fontSize, font: style.companyDetailsCaption.font},
             {data: col3[1].cap, width: companyDetailsColSize[2], align: x.left, fontSize: style.companyDetailsCaption.fontSize, font: style.companyDetailsCaption.font},
             {data: col4[1].cap, width: companyDetailsColSize[3], align: x.left, fontSize: style.companyDetailsCaption.fontSize, font: style.companyDetailsCaption.font}
             ], {border: debugBorderWidth});
    x.band( [
             {data: col1.text[2], width: companyDetailsColSize[0], align: x.left, fontSize: style.companyDetails.fontSize, font: style.companyDetails.font},
             {data: col2[1].text, width: companyDetailsColSize[1], align: x.left, fontSize: style.companyDetails.fontSize, font: style.companyDetails.font},
             {data: col3[1].text, width: companyDetailsColSize[2], align: x.left, fontSize: style.companyDetails.fontSize, font: style.companyDetails.font},
             {data: col4[1].text, width: companyDetailsColSize[3], align: x.left,
               fontSize: col4[1].focus?style.companyDetailsPaymentFocus.fontSize:style.companyDetailsPayment.fontSize,
               fontBold: col4[1].focus,
               font: style.companyDetailsPayment.font}
             ], {border: debugBorderWidth});
    if (hasExtraBand) {
      x.band( [
               {data: col1.text[3], width: companyDetailsColSize[0], align: x.left, fontSize: style.companyDetails.fontSize, font: style.companyDetails.font},
               {data: col2[2].cap, width: companyDetailsColSize[1], align: x.left, fontSize: style.companyDetailsCaption.fontSize, font: style.companyDetailsCaption.font},
               {data: col3[2].cap, width: companyDetailsColSize[2], align: x.left, fontSize: style.companyDetailsCaption.fontSize, font: style.companyDetailsCaption.font},
               {data: col4[2].cap, width: companyDetailsColSize[3], align: x.left, fontSize: style.companyDetailsCaption.fontSize, font: style.companyDetailsCaption.font}
               ], {border: debugBorderWidth});
      x.band( [
               {data: "", width: companyDetailsColSize[0], align: x.left, fontSize: style.companyDetails.fontSize, font: style.companyDetails.font},
               {data: col2[2].text, width: companyDetailsColSize[1], align: x.left, fontSize: style.companyDetails.fontSize, font: style.companyDetails.font},
               {data: col3[2].text, width: companyDetailsColSize[2], align: x.left, fontSize: style.companyDetails.fontSize, font: style.companyDetails.font},
               {data: col4[2].text, width: companyDetailsColSize[3], align: x.left,
                 fontSize: col4[2].focus?style.companyDetailsPaymentFocus.fontSize:style.companyDetailsPayment.fontSize,
                 fontBold: col4[2].focus,
               font: style.companyDetailsPayment.font}
               ], {border: debugBorderWidth});
    }
    x.addY(6);
    x.band( [
        {data: "Lätt Fakturering", width: footerLineMaxX/2, align: x.left, fontSize: style.footer.brand.fontSize},
        {data: "Sida " + x.currentPage(), width: footerLineMaxX/2 - margin, align: x.right, fontSize: style.footer.pageNumber.fontSize}
        ], {border: debugBorderWidth, font: style.footer.font});
  };


  var drawGroupHLine = function(x, yCoord, thickness, dashed) {
    dashed = typeof dashed !== 'undefined' ? dashed : false;
    var dash = dashed ? 2 : 0;
    x.line(margin - 1, yCoord, margin + detailsWidth - 1, yCoord, {thickness: thickness, dash: dash});
  };

  var drawGroupDetailBars = function(x, y1, y2, thickness) {
    if (y1 > y2) {
      y1 = headerBottomY;
    }
    x.line(margin - 1, y1, margin - 1, y2, {thickness: thickness});
    x.line(margin + detailsWidth - 1, y1, margin + detailsWidth - 1, y2, {thickness: thickness});
  };

  var drawGroupBox = function(x, startY, endY, thickness) {
    x.box(margin, startY, detailsWidth - 1, endY - startY, {thickness: thickness, fill: "#a8a8a8", fillOpacity: 0});
  };

  var groupHeader = function(x, r, withTitle) {
    // Group header
    var detailsColLbl = [
      r.hasDesc ? r.descColLbl : "",
      r.hasCount ? r.countColLbl : "",
      r.hasPrice ? r.priceColLbl : "",
      r.hasDiscount ? r.discountColLbl : "",
      r.hasVat ? r.vatColLbl : "",
      r.hasTotal ? r.totalColLbl : ""
    ];

    var anyDetailHeader = detailsColLbl.join("").length > 0;

    if (withTitle) {
      x.addY(detailsGroupTitleTopPadding);
      x.fontSize(style.details.groupTitle.fontSize);
      var groupTitle = r.title;
      if (r.hasTitleExtraField) {
        groupTitle = groupTitle + " " + r.titleExtraField;
      }
      if (groupTitle && groupTitle !== "") {
        x.print(groupTitle, {fontBold: 1, border: 0, wrap: 1, font: style.details.groupTitle.font});
      }
    }
    if (anyDetailHeader) {
      var groupHeaderTopY = x.getCurrentY();
      drawGroupHLine(x, x.getCurrentY(), detailsGroupHeaderTopLineThickness);
      x.fontSize(style.details.header.fontSize);
      var printHeader = function() {
        x.addY(detailsGroupHeaderTopPadding);
        x.band( [
          {data: detailsColLbl[0], width: detailsColSize[0], align: x.left},
          {data: detailsColLbl[1], width: detailsColSize[1], align: x.right},
          {data: detailsColLbl[2], width: detailsColSize[2], align: x.right},
          {data: detailsColLbl[3], width: detailsColSize[3], align: x.right},
          {data: detailsColLbl[4], width: detailsColSize[4], align: x.right},
          {data: detailsColLbl[5], width: detailsColSize[5], align: x.right}
        ], {fontBold: 1, border: debugBorderWidth, wrap: 1, font: style.details.header.font, padding: 2} );
      };
      // Print header once first to find out height to be able to draw gray background...
      printHeader();
      var headerHeight = x.getCurrentY() - groupHeaderTopY;
      // Gray box is background...
      x.box(margin - 1 + detailsBarsLineThickness,
            groupHeaderTopY + detailsGroupHeaderTopLineThickness,
            detailsWidth - detailsBarsLineThickness,
            /* Need to adjust height with +1, don't know why, bold font? */
            //style.details.header.fontSize + detailsGroupHeaderTopPadding  + detailsGroupHeaderBottomLineThickness + 1,
            headerHeight - detailsGroupHeaderTopLineThickness - detailsGroupHeaderBottomLineThickness,
            {thickness: 0, fill: detailsGroupHeaderFillColor});
      // Draw header on-top of gray box
      x.setCurrentY(groupHeaderTopY);
      printHeader();

      drawGroupDetailBars(x, groupHeaderTopY, x.getCurrentY(), detailsBarsLineThickness);
    }
    drawGroupHLine(x, x.getCurrentY() - detailsGroupHeaderBottomLineThickness, detailsGroupHeaderBottomLineThickness);
  };

  var invoiceDetails = function ( x, r ) {
    if (r.isValid) {
      x.fontSize(style.details.items.fontSize);
      var styleColData = function(desc, width, align) {
        return {
          data: desc,
          width: width,
          align: align
        };
      };
      var bandOpts = {border: 0, addY: detailsRowSpacing, wrap: 1, font: style.details.items.font, padding: 2};
      var y1 = x.getCurrentY();
      if (r.isTextOnly) {
        x.band( [
          styleColData(r.description, detailsWidth, x.left),
        ], bandOpts);
      } else {
        var detailsColLbl = [
          r.hasDesc ? r.description : "",
          r.hasCount ? util.formatNumber(r.count) : "",
          r.hasPrice ? util.formatCurrency(r.price, {currencyStr: invoice.currency}) : "",
          r.hasDiscount ? util.formatNumber(r.discount) + '%' : "",
          r.hasVat ? util.formatNumber(r.vat) + '%' : "",
          r.hasTotal ? util.formatCurrency(r.total, {currencyStr: invoice.currency}) : ""
        ];
        x.band( [
          styleColData(detailsColLbl[0], detailsColSize[0], x.left),
          styleColData(detailsColLbl[1], detailsColSize[1], x.right),
          styleColData(detailsColLbl[2], detailsColSize[2], x.right),
          styleColData(detailsColLbl[3], detailsColSize[3], x.right),
          styleColData(detailsColLbl[4], detailsColSize[4], x.right),
          styleColData(detailsColLbl[5], detailsColSize[5], x.right),
        ], bandOpts);
      }
      var oldStrokeColor = x.strokeColor();
      x.strokeColor(detailsSeparatorLineColor);
      drawGroupHLine(x, x.getCurrentY(), detailsSeparatorLineThickness, true);
      x.strokeColor(oldStrokeColor);
      drawGroupDetailBars(x, y1, x.getCurrentY(), detailsBarsLineThickness);
    }
  };

  var invoiceGroups = function ( x, r ) {
    if (r.isValid) {
      groupHeader(x, r, true);
      for (var i = 0; i < r.invoiceItems.length; i++) {
        invoiceDetails(x, r.invoiceItems[i]);
      }

      if (r.hasTotal && r.totalExclVat) {
        var groupSummaryTopY = x.getCurrentY();
        var totalExclVatStr = 
          util.formatCurrency(parseFloat(r.totalExclVat.toFixed(2)), {currencyStr: invoice.currency});
        x.addY(detailsGroupSummaryTopPadding);
        x.fontSize(style.details.groupSummary.fontSize);
        x.band( [
          {data: "Summa:", width: detailsSummaryCaptionColWidth, align: x.right, fontBold: style.details.groupSummary.bold, font: style.details.groupSummary.caption.font},
          {data: totalExclVatStr, width: detailsSummaryValueColWidth, align: x.right, font: style.details.groupSummary.value.font}
        ], {fontBold: 0, border: debugBorderWidth, wrap: 1, padding: 2} );
        drawGroupDetailBars(x, groupSummaryTopY, x.getCurrentY(), detailsBarsLineThickness);
      }
      drawGroupHLine(x, x.getCurrentY(), detailsGroupSummaryBottomLineThickness);
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
    x.fontSize(style.summary.fontSize);
    x.newLine();
    x.font(style.summary.font);
    x.band( [
             {data: "Netto:", width: summaryCaptionColWidth, align: x.right, fontBold: style.summary.caption.bold, font: style.summary.caption.font},
             {data: util.formatCurrency(invoice.totalExclVat, {currencyStr: invoice.currency}),
              width: summaryValueColWidth, align: x.right, font: style.summary.value.font}
           ], {fontBold: 0, border:0, width: 0, wrap: 1} );
    if (!useReverseCharge) {
      x.band( [
               {data: "Moms:", width: summaryCaptionColWidth, align: x.right, fontBold: style.summary.caption.bold, font: style.summary.caption.font},
               {data: util.formatCurrency(totalVat, {currencyStr: invoice.currency}),
                width: summaryValueColWidth, align: x.right, font: style.summary.value.font}
             ], {fontBold: 0, border:0, width: 0, wrap: 1} );
    }
    x.band( [
             {data: "Öresutjämning:", width: summaryCaptionColWidth, align: x.right, fontBold: style.summary.caption.bold, font: style.summary.caption.font},
             {data: util.formatCurrency(amountToPayAdjustment, {currencyStr: invoice.currency}),
              width: summaryValueColWidth, align: x.right, font: style.summary.value.font}
           ], {fontBold: 0, border:0, width: 0, wrap: 1} );
    x.addY(summaryAmountToPayTopPadding);
    x.band( [
             {data: "Att betala:", width: summaryCaptionColWidth, align: x.right, font: style.summary.caption.font, fontBold: 1},
             {data: util.formatCurrency(amountToPay, {currencyStr: invoice.currency}),
              width: summaryValueColWidth, align: x.right, font: style.summary.value.font, fontBold: 1}
             ], {fontBold: 1, border:0, width: 0, wrap: 1} );
    if (invoice.isCanceled) {
      x.band( [
               {data: "", width: summaryCaptionColWidth, align: x.right},
               {data: "*** MAKULERAD ***", width: summaryValueColWidth, align: x.right, font: style.summary.value.font}
               ], {fontBold: 1, border:0, width: 0, wrap: 1} );
    }
    if (useReverseCharge) {
      x.font(style.summary.customText.font);
      x.fontSize(style.summary.customText.fontSize);
      x.newLine();
      var reverseChargeText = formatTextTemplate(company.reverseChargeText, cust);
      x.print(reverseChargeText, {fontBold: 0, border: 0, wrap: 1});
    }
    if (company.paymentCustomText) {
      x.font(style.summary.customText.font);
      x.fontSize(style.summary.customText.fontSize);
      x.newLine();
      x.print(company.paymentCustomText, {fontBold: 0, border: 0, wrap: 1});
    }
  };


  // You don't have to pass in a report name; it will default to "report.pdf"
  var reportName = i18n.t('app.invoiceReport.fileName', {'cid': invoice.customer.cid, 'iid': invoice.iid});
  if (reportName === "") {
    reportName = "report.pdf";
  }

  // Support old invoices without groups
  if (!invoice.invoiceItemGroups && invoice.invoiceItems) {
    var groupToUse = {
      _id: undefined,
      name: "Detaljer konverterad",
      title: "Detaljer",
      isValid: true,
      isQuickButton: false,
      descColLbl: "Beskrivning",
      priceColLbl: "Á-pris",
      countColLbl: "Antal",
      discountColLbl: "Rabatt",
      vatColLbl: "Moms",
      totalColLbl: "Belopp",
      hasDesc: true,
      hasPrice: true,
      hasCount: true,
      hasDiscount: true,
      negateDiscount: false,
      hasVat: true,
      hasTotal: true
    };
    console.log("Detected old format of invoice id=" + invoice._id +
      " format without item groups. Converting invoice using group " + JSON.stringify(groupToUse));
    var newGroup = JSON.parse(JSON.stringify(groupToUse));
    newGroup.invoiceItems = invoice.invoiceItems;
    for (var i = 0; i < newGroup.invoiceItems.length; i++) {
      newGroup.invoiceItems[i].hasDesc = groupToUse.hasDesc;
      newGroup.invoiceItems[i].hasPrice = groupToUse.hasPrice;
      newGroup.invoiceItems[i].hasCount = groupToUse.hasCount;
      newGroup.invoiceItems[i].hasDiscount = groupToUse.hasDiscount;
      newGroup.invoiceItems[i].negateDiscount = groupToUse.negateDiscount;
      newGroup.invoiceItems[i].hasVat = groupToUse.hasVat;
      newGroup.invoiceItems[i].hasTotal = groupToUse.hasTotal;
    }
    invoice.invoiceItemGroups = [newGroup];
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
      .data(invoice.invoiceItemGroups)   // REQUIRED
      .detail(invoiceGroups) // Optional
      .font("Times-Roman")
      .fontSize(10); // Optional

  rpt.groupBy('', {runHeader: rpt.newPageOnly})
    .footer(finalsummary);
  
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
