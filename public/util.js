var formatCurrency = function(value, currencyString) {
  currencyString = typeof currencyString !== 'undefined' ? currencyString : "kr";

  var suffix = "";
  var prefix = "";
  if (currencyString === "USD") {
    prefix = "$";
  } else if (currencyString === "EUR") {
    prefix = "€";
  } else if (currencyString === "GBP") {
    prefix = "£";
  } else if (currencyString === "SEK") {
    suffix = " kr";
  } else {
    suffix = " " + currencyString;
  } 

  var decimalSeparator = ',';
  var thousandSeparator = ' ';
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
  var decPart = "00";
  if (valIntAndDec.length > 1) {
    decPart = valIntAndDec[1];
    if (decPart.length == 1) {
      decPart = decPart + "0";
    } else {
      // Extract only 2 decimals
      decPart = decPart.substr(0, 2);
    }
  }

  // Add thousand separator
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
  
  return prefix + intPart + decimalSeparator + decPart + suffix;
};

var dateAddDays = function(date, numDaysToAdd) {
  var newDateMs = date.valueOf() + (numDaysToAdd * 1000 * 3600 * 24);
  return new Date(newDateMs);
};

// Hack to get module.exports working on server side and namespace Util working on client side
(typeof module !== "undefined" && module !== null ? module : {}).exports = this.Util = {
  formatCurrency: formatCurrency,
  dateAddDays: dateAddDays,
};

