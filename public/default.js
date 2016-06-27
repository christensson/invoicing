'use strict';

var defaults = {
  initialRoute: '/page/home',
  defaultLng: "sv",
  enabledLngList: ["sv", "en"],
  uiEnabledLngList: ["sv"],
  defaultVatPercent: 25,
  invoiceLng: "sv",
  invoiceLngList: ["sv", "en"],
  invoiceReportStyle: "right",
  invoiceReportStyleList: ["right", "left"],
  defaultCurrency: "SEK",
  currencyList: ["SEK", "EUR", "USD", "GBP"], // First is default
  currencyWildcard: "Wildcard",
  invoiceNumDecTrunc: 2,
  invoiceÍtemTotalNumDecRound: 2,
  invoiceCurrencyAdjNumDec: {
    "SEK": 0,
    "EUR": 2,
    "USD": 2,
    "GBP": 2,
  },
  firstCid: 100,
  firstIid: 100,
  firstOid: 100,
  minPwdLen: 8,
  invoiceListFilter: {
    isPaneExpanded: true,
    showPaid: true,
    showUnpaid: true,
    showUnpaidExpired: true,
    showNotCredit: true,
    showCredit: true,
    showNotCanceled: true,
    showCanceled: false,
  },
  logFile: 'log/log.txt'
};

var getDefaults = function() {
  return defaults;
};

// Hack to get module.exports working on server side and namespace Util working on client side
(typeof module !== "undefined" && module !== null ? module : {}).exports = this.Default = {
  get: getDefaults,
};

