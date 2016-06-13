'use strict';

var Report = require('fluentreports').Report;
var fs = require('fs');
var util = require('./public/util.js');
var defaults = require('./public/default.js').get();
var i18n = require('i18next');
var log = require('./log');

var convMmToDpi = function(lengthMm) {
  // 1 inch = 72 dots = 25.4 mm = 2,8346 dots/mm
  return (lengthMm * 72) / 25.4;
};

module.exports.doInvoiceReport = function (invoice, tmpDir, onCompletion, opts) {
  'use strict';
  opts = typeof opts !== 'undefined' ? opts : {};
  if (!opts.hasOwnProperty('isReminder')) {
    opts.isReminder = false;
  }
  if (!opts.hasOwnProperty('isDemoMode')) {
    opts.isDemoMode = false;
  }
  if (!opts.hasOwnProperty('debug')) {
    opts.debug = false;
  }
  if (!opts.hasOwnProperty('verbosity')) {
    opts.verbosity = 0;
  }
  if (!opts.hasOwnProperty('outFile')) {
    opts.outFile = false;
  }

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
  var docType = invoice.hasOwnProperty('docType')?invoice.docType:'invoice';

  var invoiceStyle = defaults.invoiceReportStyle;
  if (invoice.company.invoiceStyle) {
    invoiceStyle = invoice.company.invoiceStyle;
  }
  
  var invoiceLng = defaults.invoiceLng;
  if (invoice.customer.invoiceLng) {
    invoiceLng = invoice.customer.invoiceLng;
  }

  var invoiceCurrency = defaults.invoiceLng;
  if (invoice.customer.currency) {
    invoiceCurrency = invoice.customer.currency;
  } else if (invoice.currency) {
    invoiceCurrency = invoice.currency;
  }

  var getStr = function(key) {
    var opt = {lng: invoiceLng};
    var contextSepIdx = key.indexOf('_');
    if (contextSepIdx != -1) {
      opt.context = key.slice(contextSepIdx + 1);
      key = key.slice(0, contextSepIdx);
    };
    var transNs = 'app.' + docType + "Report.";
    var tStr = i18n.t(transNs + key, opt);
    log.silly("getStr: translate ns=" + transNs + ", key=" + key +
      ", opt=" + JSON.stringify(opt) + " => " + tStr);
    return tStr;
  };

  var fmtNumOpt = {
    decimalSep: getStr('decimalSeparator'),
    thousandSep: ' '
  };

  var fmtCurrencyOpt = {
    decimalSep: getStr('decimalSeparator'),
    thousandSep: ' ',
    currencyStr: invoiceCurrency,
    numDecimalTrunc: 2,
    zeroFill: true
  };


  var amountToPayAdjNumDec = defaults.invoiceCurrencyAdjNumDec[invoiceCurrency];

  var fmtCurrencyOptPayAdj = {
    decimalSep: getStr('decimalSeparator'),
    thousandSep: ' ',
    currencyStr: invoiceCurrency,
    numDecimalTrunc: amountToPayAdjNumDec + 1,
    zeroFill: true
  };
  // We want at least the number of decimals as all other currencies...
  if (fmtCurrencyOptPayAdj.numDecimalTrunc < fmtCurrencyOpt.numDecimalTrunc) {
    fmtCurrencyOptPayAdj.numDecimalTrunc = fmtCurrencyOpt.numDecimalTrunc;
  }

  log.verbose("invoiceStyle: " + invoiceStyle);  
  log.verbose("invoiceLng: " + invoiceLng);

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
      fontSize: 8,
      font: "Helvetica",
    },
    headerDetails: {
      fontSize: 9,
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
  var margins = {left: margin, right: margin, bottom: 30, top: 30};
  var pageHeaderHeight = undefined;
  var pageFooterSeparatorLineThickness = 0.5;
  var pageFooterHeight = undefined;
  var pageFooterTopY = undefined;
  var finalSummaryHeight = undefined;
  
  // Default X values is for invoiceStyle "right"
  var headerStringX = convMmToDpi(114 + 10) - margin;
  var headerStringY = 30;
  var headerStringWidth = 230;
  var subHeaderStringX = headerStringX;
  var subHeaderStringY = 55;
  var subHeaderStringWidth = 230;

  // C5 Envelope window is 100 x 34 mm
  // H2 placement is 114 mm from left, 15 mm from right and 44 mm from top.
  // Reference: http://epi.mapsverige.se/upload/Produktkatalogen/Dokument/Kuvert%20F%C3%B6nsterplacering.pdf
  var envelopeWinX = convMmToDpi(114);
  var envelopeWinY = convMmToDpi(44);
  var envelopeWinWidth = convMmToDpi(210 - 114 - 15);
  var envelopeWinHeight = convMmToDpi(34);

  var customerAddrX = headerStringX;
  var customerAddrY = convMmToDpi(45);
  var customerAddrWidth = 300;
  var customerAddrCaptionX = customerAddrX;
  var customerAddrCaptionY = customerAddrY - convMmToDpi(7);
  
  var companyLogoX = margin;
  var companyLogoY = 30;
  var companyLogoWidth = convMmToDpi(100);
  var companyLogoHeight = convMmToDpi(50);
  var companyLogoAlign = "left";

  var companyNameX = companyLogoX - margin;
  var companyNameY = companyLogoY + companyLogoHeight + convMmToDpi(4);
  var companyNameWidth = companyLogoWidth;
  var companyNameAlign = "left";
  
  if (invoiceStyle === "left") {
    // V2 placement is 15 mm from left, 114 mm from right and 44 mm from top.
    headerStringX = 0;
    subHeaderStringX = 0;
    envelopeWinX = convMmToDpi(15);
    envelopeWinWidth = convMmToDpi(210 - 114 - 15);
    customerAddrX = convMmToDpi(20) - margin;
    customerAddrCaptionX = customerAddrX;
    companyLogoX = convMmToDpi(99);
    companyNameX = companyLogoX - margin;
    companyLogoAlign = "right";
    companyNameAlign = "right";
  }

  var demoModeBgImg = "img/invoice_demo.png";
  var demoModeBgW = 442;
  var demoModeBgH = 442;
  var debugBorderWidth = opts.debug?0.5:0;

  var detailsColSize = [190, 60, 70, 50, 40, 110];
  var detailsWidth = detailsColSize.reduce(function(a, b) { return a + b; });

  var detailsSummaryValueColWidth = detailsColSize[detailsColSize.length - 1];
  var detailsSummaryCaptionColWidth = detailsWidth - detailsSummaryValueColWidth;

  var summaryValueColWidth = detailsSummaryValueColWidth;
  var summaryCaptionColWidth = detailsSummaryCaptionColWidth;

  var headerBottomY = 0;

  var formatDate = function(value) {
    var dateStr = "";
    if (value !== undefined) {
      var date = new Date(value);
      var isoDateString = date.toISOString();
      dateStr = isoDateString.split("T")[0];
    }
    return dateStr;
  };
  
  var formatTextTemplate = function(text, cust) {
    var formatedText = text;
    if (formatedText !== undefined && cust.vatNr !== undefined) {
      formatedText = formatedText.replace("%c.vatNr%", cust.vatNr);
    }
    log.debug("formatTextTemplate(): Formated text: " + formatedText);
    return formatedText;
  };

  var mytitleheader = function(x) {
    var headerString = getStr("headerString");
    if (invoice.isCredit) {
      headerString = getStr("headerString_isCredit");
    }
    var subHeaderString = getStr("subHeaderString");
    if (invoice.isCanceled) {
      subHeaderString = getStr("subHeaderString_isCanceled");
    } else if (opts.isReminder) {
      subHeaderString = getStr("subHeaderString_isReminder");
    }
    x.band([{data: headerString, width: headerStringWidth, fontSize: style.header.fontSize, fontBold: true}],
           {x: headerStringX, y: headerStringY, font: style.header.font, border: debugBorderWidth});
    if (subHeaderString.length > 0) {
      x.band([{data: subHeaderString, width: subHeaderStringWidth, fontSize: style.subHeader.fontSize, fontBold: true, fontItalic: true}],
             {x: subHeaderStringX, y: subHeaderStringY, font: style.subHeader.font, border: debugBorderWidth});
    }
    
    x.band([{data: getStr("customerAddrCaption"), width: customerAddrWidth, fontSize: style.customerAddrCaption.fontSize}],
           {x: customerAddrCaptionX, y: customerAddrCaptionY, font: style.customerAddrCaption.font});
    x.fontSize(style.customerAddr.fontSize);
    x.font(style.customerAddr.font);
    x.band([{data: invoice.customer.name, width: customerAddrWidth}],
        {x: customerAddrX, y: customerAddrY, border: debugBorderWidth});
    x.band([{data: invoice.customer.addr1, width: customerAddrWidth}], {x: customerAddrX, border: debugBorderWidth});
    x.band([{data: invoice.customer.addr2, width: customerAddrWidth}], {x: customerAddrX, border: debugBorderWidth});
    x.band([{data: invoice.customer.addr3, width: customerAddrWidth}], {x: customerAddrX, border: debugBorderWidth});
    
    if (opts.debug) {
      x.box(envelopeWinX, envelopeWinY, envelopeWinWidth, envelopeWinHeight, {dash: 1});
    }

    if (invoice.company.logo !== undefined && invoice.company.logo.path !== undefined) {
      if (fs.existsSync(invoice.company.logo.path)) {
        x.image(invoice.company.logo.path, {
          x: companyLogoX, y: companyLogoY, align: companyLogoAlign, fit: [companyLogoWidth, companyLogoHeight]});
      } else {
        log.warn("doInvoiceReport: Logo file not found. path=" + invoice.company.logo.path +
          ", companyId=" + invoice.company._id);
      }
      if (opts.debug) {
        x.box(companyLogoX, companyLogoY, companyLogoWidth, companyLogoHeight);
      }
    } else {
      log.verbose("doInvoiceReport: No company logo configured for companyId=" + invoice.company._id);
    }

    x.setCurrentY(companyNameY);
    if (companyNameAlign === "left") {
      companyNameAlign = x.left;
    } else if (companyNameAlign === "right") {
      companyNameAlign = x.right;
    }
    x.band([{data: invoice.company.name, width: companyNameWidth, fontSize: style.companyName.fontSize, fontBold: true, align: companyNameAlign}],
        {font: style.companyName.font, border: debugBorderWidth, x: companyNameX});

    x.addY(10);
    
    mypageheader(x);
  };

  var mypageheader = function(x) {
    var topY = x.getCurrentY();
    var headerColSize = [80, 60, 50, 50, 90, 90, 90];
    var headerList = [];
    if (docType == 'invoice') {
      headerList.push({cap: getStr("lastPaymentDateCaption"), data: formatDate(invoice.lastPaymentDate), isBold: true, colSize: headerColSize[0]});
      headerList.push({cap: getStr("invoiceDateCaption"), data: formatDate(invoice.date), isBold: false, colSize: headerColSize[1]});
    } else {
      // Offers doesn't have a last payment date, instead let the date occupy column 0 and 1
      headerList.push({cap: getStr("invoiceDateCaption"), data: formatDate(invoice.date), isBold: false, colSize: headerColSize[0] + headerColSize[1]});
    }
    headerList.push({cap: getStr("invoiceNrCaption"), data: "" + invoice.docNr, isBold: false, colSize: headerColSize[2]});
    headerList.push({cap: getStr("customerNrCaption"), data: "" + invoice.customer.cid, isBold: false, colSize: headerColSize[3]});
    if (invoice.projId !== undefined && invoice.projId.length > 0) {
      headerList.push({cap: getStr("projIdCaption"), data: invoice.projId, isBold: false, colSize: headerColSize[4]});
    }
    if (invoice.ourRef !== undefined && invoice.ourRef.length > 0) {
      headerList.push({cap: getStr("ourRefCaption"), data: invoice.ourRef, isBold: false, colSize: headerColSize[5]});
    }
    if (invoice.yourRef !== undefined && invoice.yourRef.length > 0) {
      headerList.push({cap: getStr("yourRefCaption"), data: invoice.yourRef, isBold: false, colSize: headerColSize[6]});
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

    if (opts.isDemoMode) {
      x.image(demoModeBgImg, {
        x: (x.maxX() / 2) - (demoModeBgW/2) + margin/2,
        y: (x.maxY() / 2) - (demoModeBgH/2) + margin/2,
        align: "left", fit: [demoModeBgW, demoModeBgH]});
    }

    pageHeaderHeight = x.getCurrentY() - topY;
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

  var groupHeader = function(x, r, withTitle, invoiceHasVat, renderGroupBox) {
    // Group header
    var detailsColLbl = [
      r.hasDesc ? r.descColLbl : "",
      r.hasCount ? r.countColLbl : "",
      r.hasPrice ? r.priceColLbl : "",
      r.hasDiscount ? r.discountColLbl : "",
      r.hasVat && invoiceHasVat ? r.vatColLbl : "",
      r.hasTotal ? r.totalColLbl : ""
    ];

    var anyDetailHeader = detailsColLbl.join("").length > 0;

    if (withTitle) {
      x.addY(detailsGroupTitleTopPadding);
      x.fontSize(style.details.groupTitle.fontSize);
      var groupTitle = r.title;
      if (r.hasTitleExtraField) {
        // Only separate title and titleExtraField with space if title exist
        if (groupTitle && groupTitle !== "") {
          groupTitle = groupTitle + " ";
        }
        groupTitle = groupTitle + r.titleExtraField;
      }
      if (groupTitle && groupTitle !== "") {
        x.print(groupTitle, {fontBold: 1, border: 0, wrap: 1, font: style.details.groupTitle.font});
      }
    }
    if (anyDetailHeader) {
      var groupHeaderTopY = x.getCurrentY();
      if (renderGroupBox) {
        drawGroupHLine(x, x.getCurrentY(), detailsGroupHeaderTopLineThickness);
      }
      x.fontSize(style.details.header.fontSize);
      var printHeader = function(isDummy) {
        x.addY(detailsGroupHeaderTopPadding);
        var dummyStr = " ";
        x.band( [
          {data: isDummy?dummyStr:detailsColLbl[0], width: detailsColSize[0], align: x.left},
          {data: isDummy?dummyStr:detailsColLbl[1], width: detailsColSize[1], align: x.right},
          {data: isDummy?dummyStr:detailsColLbl[2], width: detailsColSize[2], align: x.right},
          {data: isDummy?dummyStr:detailsColLbl[3], width: detailsColSize[3], align: x.right},
          {data: isDummy?dummyStr:detailsColLbl[4], width: detailsColSize[4], align: x.right},
          {data: isDummy?dummyStr:detailsColLbl[5], width: detailsColSize[5], align: x.right}
        ], {fontBold: 1, border: debugBorderWidth, wrap: 1, font: style.details.header.font, padding: 2} );
      };
      // Print header once first to find out height to be able to draw gray background...
      printHeader(true);
      var headerHeight = x.getCurrentY() - groupHeaderTopY;
      if (headerHeight >= 0) {
        log.verbose("groupHeader: Calculated detail-header height=" + headerHeight +
          ", will render at y=" + groupHeaderTopY);
      } else if (headerHeight < 0) {
        // Handle page-wrap
        groupHeaderTopY = x.minY() + pageHeaderHeight;
        // Need to add 3 to height, don't know why...
        headerHeight = x.getCurrentY() - groupHeaderTopY + 3;
        log.verbose("groupHeader: Detected page-wrap. Calculated detail-header height=" + headerHeight +
          ", will render at y=" + groupHeaderTopY);
      }
      // Gray box is background...
      if (renderGroupBox) {
        x.box(margin - 1 + detailsBarsLineThickness,
              groupHeaderTopY + detailsGroupHeaderTopLineThickness,
              detailsWidth - detailsBarsLineThickness,
              headerHeight - detailsGroupHeaderTopLineThickness - detailsGroupHeaderBottomLineThickness,
              {thickness: 0, fill: detailsGroupHeaderFillColor});
      }
      // Draw header on-top of gray box
      x.setCurrentY(groupHeaderTopY);
      if (renderGroupBox) {
        drawGroupHLine(x, x.getCurrentY(), detailsGroupHeaderTopLineThickness);
      }
      printHeader(false);

      if (renderGroupBox) {
        drawGroupDetailBars(x, groupHeaderTopY, x.getCurrentY(), detailsBarsLineThickness);
      }
    }
    if (renderGroupBox) {
      drawGroupHLine(x, x.getCurrentY() - detailsGroupHeaderBottomLineThickness, detailsGroupHeaderBottomLineThickness);
    }
  };

  var invoiceDetails = function (x, r, invoiceHasVat, renderGroupBox) {
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
          r.hasCount ? util.formatNumber(r.count, fmtNumOpt) : "",
          r.hasPrice ? util.formatCurrency(r.price, fmtCurrencyOpt) : "",
          r.hasDiscount ? util.formatNumber(r.discount, fmtNumOpt) + '%' : "",
          r.hasVat && invoiceHasVat ? util.formatNumber(r.vat, fmtNumOpt) + '%' : "",
          r.hasTotal ? util.formatCurrency(r.total, fmtCurrencyOpt) : ""
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
      if (renderGroupBox) {
        drawGroupHLine(x, x.getCurrentY(), detailsSeparatorLineThickness, true);
      }
      x.strokeColor(oldStrokeColor);
      if (renderGroupBox) {
        drawGroupDetailBars(x, y1, x.getCurrentY(), detailsBarsLineThickness);
      }
    }
  };

  var invoiceGroups = function ( x, r ) {
    if (r.isValid) {
      var invoiceHasVat = !invoice.customer.useReverseCharge && !invoice.customer.noVat
      var renderGroupBox = !r.noGroupBox;
      groupHeader(x, r, true, invoiceHasVat, renderGroupBox);
      for (var i = 0; i < r.invoiceItems.length; i++) {
        invoiceDetails(x, r.invoiceItems[i], invoiceHasVat, renderGroupBox);
      }

      if (r.hasTotal && r.totalExclVat !== undefined && r.totalExclVat !== null) {
        var groupSummaryTopY = x.getCurrentY();
        var totalExclVatStr = 
          util.formatCurrency(parseFloat(r.totalExclVat.toFixed(2)), fmtCurrencyOpt);
        x.addY(detailsGroupSummaryTopPadding);
        x.fontSize(style.details.groupSummary.fontSize);
        x.band( [
          {data: getStr("groupSumLbl"), width: detailsSummaryCaptionColWidth, align: x.right, fontBold: style.details.groupSummary.bold, font: style.details.groupSummary.caption.font},
          {data: totalExclVatStr, width: detailsSummaryValueColWidth, align: x.right, font: style.details.groupSummary.value.font}
        ], {fontBold: 0, border: debugBorderWidth, wrap: 1, padding: 2} );
        if (renderGroupBox) {
          drawGroupDetailBars(x, groupSummaryTopY, x.getCurrentY(), detailsBarsLineThickness);
        }
      }
      if (renderGroupBox) {
        drawGroupHLine(x, x.getCurrentY(), detailsGroupSummaryBottomLineThickness);
      }
    }
  };

  var finalsummary = function(x, r) {
    log.verbose("finalsummary: Render");
    if (finalSummaryHeight !== undefined && pageFooterTopY !== undefined) {
      // First check if we need to page-break to not overflow into footer
      var distanceToPageFooter = pageFooterTopY - x.getCurrentY();
      if (finalSummaryHeight > distanceToPageFooter) {
        log.verbose("finalsummary: page-break needed. distanceToPageFooter=" +
          distanceToPageFooter + ", distanceRequired=" + finalSummaryHeight + ", pageFooterTopY=" + pageFooterTopY);
        x.newPage();
      } else {
        log.verbose("finalsummary: No page-break needed. distanceToPageFooter=" +
          distanceToPageFooter + ", distanceRequired=" + finalSummaryHeight + ", pageFooterTopY=" + pageFooterTopY);
      }
    }

    var finalsummaryTopY = x.getCurrentY();

    var company = invoice.company;
    var cust = invoice.customer;
    var totalExclVat = invoice.totalExclVat;
    var totalVat = invoice.totalInclVat - totalExclVat;
    totalVat = parseFloat(totalVat.toFixed(2));
    totalExclVat = parseFloat(totalExclVat.toFixed(2));
    var noVat = cust.noVat === true || cust.useReverseCharge === true;
    var useReverseCharge = cust.useReverseCharge === true;
    var amountToPay = noVat?invoice.totalExclVat:invoice.totalInclVat;
    var amountToPayAdj = util.calcPaymentAdjustment(
      amountToPay, {numDec: amountToPayAdjNumDec, verbose: opts.verbosity > 1?true:false});
    amountToPay = amountToPay + amountToPayAdj;
    x.fontSize(style.summary.fontSize);
    x.newLine();
    x.font(style.summary.font);
    x.band( [
             {data: getStr("summaryTotalExclVatLbl"), width: summaryCaptionColWidth, align: x.right, fontBold: style.summary.caption.bold, font: style.summary.caption.font},
             {data: util.formatCurrency(invoice.totalExclVat, fmtCurrencyOpt),
              width: summaryValueColWidth, align: x.right, font: style.summary.value.font}
           ], {fontBold: 0, border:0, width: 0, wrap: 1} );
    if (!noVat) {
      x.band( [
               {data: getStr("summaryTotalVatLbl"), width: summaryCaptionColWidth, align: x.right, fontBold: style.summary.caption.bold, font: style.summary.caption.font},
               {data: util.formatCurrency(totalVat, fmtCurrencyOpt),
                width: summaryValueColWidth, align: x.right, font: style.summary.value.font}
             ], {fontBold: 0, border:0, width: 0, wrap: 1} );
    }
    if (amountToPayAdj !== undefined) {
      x.band( [
               {data: getStr("summaryTotalToPayAdjLbl_" + invoiceCurrency), width: summaryCaptionColWidth, align: x.right, fontBold: style.summary.caption.bold, font: style.summary.caption.font},
               {data: util.formatCurrency(amountToPayAdj, fmtCurrencyOptPayAdj),
                width: summaryValueColWidth, align: x.right, font: style.summary.value.font}
             ], {fontBold: 0, border:0, width: 0, wrap: 1} );
    }
    x.addY(summaryAmountToPayTopPadding);
    x.band( [
             {data: getStr("summaryTotalToPayLbl"), width: summaryCaptionColWidth, align: x.right, font: style.summary.caption.font, fontBold: 1},
             {data: util.formatCurrency(amountToPay, fmtCurrencyOpt),
              width: summaryValueColWidth, align: x.right, font: style.summary.value.font, fontBold: 1}
             ], {fontBold: 1, border:0, width: 0, wrap: 1} );
    if (invoice.isCanceled) {
      x.band( [
               {data: "", width: summaryCaptionColWidth, align: x.right},
               {data: getStr("summaryTotalIsCanceledLbl"), width: summaryValueColWidth, align: x.right, font: style.summary.value.font}
               ], {fontBold: 1, border:0, width: 0, wrap: 1} );
    }

    if (docType == 'invoice' && useReverseCharge) {
      x.font(style.summary.customText.font);
      x.fontSize(style.summary.customText.fontSize);
      x.newLine();
      var reverseChargeText = formatTextTemplate(company[invoiceLng].reverseChargeText, cust);
      x.print(reverseChargeText, {fontBold: 0, border: 0, wrap: 1});
    }
    if (docType == 'invoice' && company[invoiceLng].paymentCustomText) {
      x.font(style.summary.customText.font);
      x.fontSize(style.summary.customText.fontSize);
      x.newLine();
      x.print(company[invoiceLng].paymentCustomText, {fontBold: 0, border: 0, wrap: 1});
    }

    if (finalSummaryHeight === undefined) {
      finalSummaryHeight = x.getCurrentY() - finalsummaryTopY;
      log.verbose("finalsummary: Calculated height=" + finalSummaryHeight);
    }

    var height = x.getCurrentY() - finalsummaryTopY;
    log.debug("finalsummary: Rendered with height " + height);
  };

  var mypagefooter = function(x, r) {
    log.verbose("footer: Render");
    if (pageFooterHeight !== undefined) {
      log.verbose("footer: top-y set to " + pageFooterTopY + ", maxY=" + x.maxY() + ", height=" + pageFooterHeight);
      x.setCurrentY(pageFooterTopY);
    }
    var mypagefooterTopY = x.getCurrentY();
    x.addY(5);
    var footerLineMaxX = margin + detailsWidth - 1;
    x.line(margin, x.getCurrentY(), footerLineMaxX, x.getCurrentY(), {thickness: pageFooterSeparatorLineThickness});
    x.addY(3);
    var c = invoice.company;
    var hasExtraBand = false;
    var col1 = {
        cap: getStr("companyAddrCaption"),
        text: [c.name, c.addr1, c.addr2, c.addr3]
    };
    if (c.addr3 !== undefined && c.addr3.length > 0) {
      hasExtraBand = true;
    }

    var cLngFields = c[invoiceLng];

    var col2 = [{cap: cLngFields.contact1Caption, text: cLngFields.contact1},
                {cap: cLngFields.contact2Caption, text: cLngFields.contact2},
                {cap: cLngFields.contact3Caption, text: cLngFields.contact3}];
    if (cLngFields.contact3 !== undefined && cLngFields.contact3.length > 0) {
      hasExtraBand = true;
    }

    var col3 = [{cap: getStr("companyVatNrCaption"), text: c.vatNr}];
    if (c.orgNr !== undefined && c.orgNr.length > 0) {
      col3.push({cap: getStr("companyOrgNrCaption"), text: c.orgNr});
      hasExtraBand = true;
    }
    col3.push({cap: "", text: cLngFields.vatNrCustomText});
    // Add dummy to always have at least three items
    col3.push({cap: "", text: ""});

    var col4 = [{cap: cLngFields.payment1Caption, text: cLngFields.payment1, focus: cLngFields.paymentFocus === "1"},
                {cap: cLngFields.payment2Caption, text: cLngFields.payment2, focus: cLngFields.paymentFocus === "2"},
                {cap: cLngFields.payment3Caption, text: cLngFields.payment3, focus: cLngFields.paymentFocus === "3"}];
    if (cLngFields.payment3 !== undefined && cLngFields.payment3.length > 0) {
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
        {data: getStr("footerAdvertismentLbl"), width: footerLineMaxX/2, align: x.left, fontSize: style.footer.brand.fontSize},
        {data: getStr("footerPageLbl") + x.currentPage(), width: footerLineMaxX/2 - margin, align: x.right, fontSize: style.footer.pageNumber.fontSize}
        ], {border: debugBorderWidth, font: style.footer.font});
    if (pageFooterHeight === undefined) {
      pageFooterHeight = x.getCurrentY() - mypagefooterTopY;
      pageFooterTopY = x.maxY() - pageFooterHeight;
      log.verbose("footer: Calculated height=" + pageFooterHeight + ", topY=" + pageFooterTopY);
    }
    var height = x.getCurrentY() - mypagefooterTopY;
    log.debug("footer: Rendered with height " + height);
  };

  // You don't have to pass in a report name; it will default to "report.pdf"
  var reportName = i18n.t('app.' + docType + 'Report.fileName',
    {'cid': invoice.customer.cid, 'docNr': invoice.docNr, 'lng': invoiceLng});
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
    log.info("Detected old format of invoice id=" + invoice._id +
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

  // Support old companies without multiple languages
  if (!invoice.company.hasOwnProperty("sv")) {
    log.info("Detected old company format of invoice id=" + invoice._id +
      " without info for multiple languages. Converting invoice to support language sv.");
    var companyFieldsToCopy = [
      "contact1Caption",
      "contact2Caption",
      "contact3Caption",
      "contact1",
      "contact2",
      "contact3",
      "payment1Caption",
      "payment2Caption",
      "payment3Caption",
      "payment1",
      "payment2",
      "payment3",
      "paymentFocus",
      "paymentCustomText",
      "vatNrCustomText",
      "reverseChargeText"
    ];
    for (var i = 0; i < defaults.invoiceLngList.length; i++) {
      var lng = defaults.invoiceLngList[i]; 
      invoice.company[lng] = {};
    }

    for (var j = 0; j < companyFieldsToCopy.length; j++) {
      var field = companyFieldsToCopy[j];
      invoice.company["sv"][field] = invoice.company[field];
    }
  }
  
  // Support old invoices without docNr
  if (invoice.hasOwnProperty('iid') && !invoice.hasOwnProperty('docNr')) {
      invoice.docNr = invoice.iid;
  }

  // companyId makes directory unique
  var companyId = invoice.company._id;
  var reportDir = tmpDir + "/" + companyId;
  log.info("Report name: " + reportName + " (dir=" + reportDir + ")");
  if (!fs.existsSync(reportDir)) {
    log.info("Created dir: " + reportDir);
    fs.mkdirSync(reportDir);
  }
  //TODO: Cleanup old reports
  var reportPath = reportDir + "/" + reportName;
  
  // Override reportPath
  if (opts.outFile) {
    reportPath = opts.outFile;
  }

  if (opts.verbosity > 1) {
    Report.trace = true;
  }

  var rpt = new Report(reportPath)
      .margins(margins)
      .paper('A4')
      .titleHeader(mytitleheader)
      .pageHeader(mypageheader)
      .pageFooter(mypagefooter)
      .data(invoice.invoiceItemGroups)   // REQUIRED
      .detail(invoiceGroups) // Optional
      //.finalSummary(finalsummary)
      .font("Times-Roman")
      .fontSize(10); // Optional

  rpt.groupBy('', {runHeader: rpt.newPageOnly})
      .footer(finalsummary);

  // Debug output is always nice (Optional, to help you see the structure)
  rpt.printStructure();

  // This does the MAGIC...  :-)
  log.profile("Rendered");
  rpt.render(function(err, name) {
      log.profile("Rendered");
      if (err) {
          log.error("Report had an error: " + err);
      } else {
        log.verbose("Report is named: " + name);
        onCompletion(name);
      }
  });

};
