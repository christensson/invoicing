'use strict';

/** Format a number to a string
 * @param opts.decimalSep (Default: ',')
 * @param opts.thousandSep (Default: ' ')
 * @param opts.numDecimalTrunc (Default: no decimal truncation)
 * @param opts.zeroFill (Default: false)
 */
var formatNumber = function(value, opts) {
  opts = typeof opts !== 'undefined' ? opts : {};
  // Set default parameters
  if (!opts.decimalSep) {
    opts.decimalSep = ',';
  }
  if (!opts.thousandSep) {
    opts.thousandSep = ' ';
  }
  if (!opts.zeroFill) {
    opts.zeroFill = false;
  }

  var valueString = value.toString();
  var valIntAndDec = valueString.split('.');
  if (valIntAndDec.length == 1) {
    // No decimals found, try with other decimal separator...
    valIntAndDec = valueString.split(',');
  }
  var intPart = valIntAndDec[0];
  
  if (intPart === "NaN") {
    intPart = "0";
  }

  // Fix decimals
  var decPartNumZeroPad = 0;
  var decPart = "";
  if (opts.zeroFill && opts.numDecimalTrunc) {
    decPartNumZeroPad = opts.numDecimalTrunc;
  }

  if (valIntAndDec.length > 1) {
    // There are decimals
    decPart = valIntAndDec[1];
    if (opts.zeroFill && decPart.length < opts.numDecimalTrunc) {
      decPartNumZeroPad = opts.numDecimalTrunc - decPart.length;
    } else if (opts.numDecimalTrunc) {
      // Extract only specified number of decimals
      decPart = decPart.substr(0, opts.numDecimalTrunc);
      decPartNumZeroPad = 0;
    }
  }

  if (decPartNumZeroPad > 0) {
    for (var i = 0; i < decPartNumZeroPad; i++) {
      decPart += '0';
    }
  }

  // Add thousand separator
  if (opts.thousandSep) {
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, opts.thousandSep);
  }
  
  var resultStr = intPart;
  if (decPart !== "") {
    resultStr = resultStr + opts.decimalSep + decPart;
  }
  return resultStr;
};

/** Format a number to a string
 * @param opts.currencyStr (Default: "kr")
 * @param opts.decimalSep (Default: ',')
 * @param opts.thousandSep (Default: ' ')
 * @param opts.numDecimalTrunc (Default: 2)
 * @param opts.zeroFill (Default: true)
 */
var formatCurrency = function(value, opts) {
  opts = typeof opts !== 'undefined' ? opts : {};
  // Set default parameters
  if (!opts.currencyStr) {
    opts.currencyStr = 'kr';
  }
  if (!opts.numDecimalTrunc) {
    opts.numDecimalTrunc = 2;
  }
  if (!opts.zeroFill) {
    opts.zeroFill = true;
  }

  var suffix = "";
  var prefix = "";
  if (opts.currencyStr === "USD") {
    prefix = "$";
  } else if (opts.currencyStr === "EUR") {
    prefix = "€";
  } else if (opts.currencyStr === "GBP") {
    prefix = "£";
  } else if (opts.currencyStr === "SEK") {
    suffix = " kr";
  } else {
    suffix = " " + opts.currencyStr;
  }

  return prefix + formatNumber(value, opts) + suffix;
};

/** Calculates how much to adjust payment
 * @param value Amount to calculate adjustment for
 * @param opts.numDec Round to decimal. (Default: 0)
 */
var calcPaymentAdjustment = function(amount, opts) {
  opts = typeof opts !== 'undefined' ? opts : {};
  if (!opts.numDec) {
    opts.numDec = 0;
  }
  var numDecFactor = Math.pow(10, -opts.numDec);
  var SCALE = 100 / numDecFactor; // Scale numbers to cope with double-precision problems
  var amountRounded = Math.round(amount / numDecFactor) * numDecFactor;
  var adjustment = ((amountRounded * SCALE) - (amount * SCALE)) / SCALE;
  var adjustedAmount = amount + adjustment;
  if (opts.verbose) {
    console.log("calcPaymentAdjustment: amountRounded=" + amountRounded +
      ", adjustment=" + adjustment + ", adjustedAmount=" + adjustedAmount + ", opts.numDec=" + opts.numDec);
  }
  return adjustment;
};

var dateAddDays = function(date, numDaysToAdd) {
  var newDateMs = date.valueOf() + (numDaysToAdd * 1000 * 3600 * 24);
  return new Date(newDateMs);
};

// Hack to get module.exports working on server side and namespace Util working on client side
(typeof module !== "undefined" && module !== null ? module : {}).exports = this.Util = {
  formatCurrency: formatCurrency,
  formatNumber: formatNumber,
  calcPaymentAdjustment: calcPaymentAdjustment,
  dateAddDays: dateAddDays,
};

