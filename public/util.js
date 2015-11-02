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
  return prefix + valueString + suffix;
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

