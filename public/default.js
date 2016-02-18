var defaults = {
  defaultLng: "sv",
  enabledLngList: ["sv", "en"],
  uiEnabledLngList: ["sv", "en"],
  invoiceLng: "sv",
  invoiceLngList: ["sv", "en"],
  invoiceReportStyle: "right",
  invoiceReportStyleList: ["right", "left"],
  firstCid: 100,
  firstIid: 100,
};

var getDefaults = function() {
  return defaults;
};

// Hack to get module.exports working on server side and namespace Util working on client side
(typeof module !== "undefined" && module !== null ? module : {}).exports = this.Default = {
  get: getDefaults,
};

