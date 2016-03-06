'use strict';

var defaults = {
  defaultLng: "sv",
  enabledLngList: ["sv", "en"],
  uiEnabledLngList: ["sv"],
  invoiceLng: "sv",
  invoiceLngList: ["sv", "en"],
  invoiceReportStyle: "right",
  invoiceReportStyleList: ["right", "left"],
  defaultCurrency: "SEK",
  currencyList: ["SEK", "EUR", "USD", "GBP"], // First is default
  invoiceCurrencyAdjNumDec: {
    "SEK": 0,
    "EUR": 2,
    "USD": 2,
    "GBP": 2,
  },
  firstCid: 100,
  firstIid: 100,
  minPwdLen: 8
};

var getDefaults = function() {
  return defaults;
};

// Hack to get module.exports working on server side and namespace Util working on client side
(typeof module !== "undefined" && module !== null ? module : {}).exports = this.Default = {
  get: getDefaults,
};

