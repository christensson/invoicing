'use strict';

var defaults = Default.get();

function Log(){};

Log._getCallerInfo = function() {
  var isFirefox = typeof InstallTrigger !== 'undefined';
  var isChrome = !!window.chrome && !!window.chrome.webstore;
  var err = undefined;
  try { throw Error(''); } catch(e) { err = e; }
  if (isChrome) {
    var callerLine = err.stack.split("\n")[4];
    var callerFuncStart = callerLine.indexOf("at ") + 3;
    return callerLine.slice(callerFuncStart, callerLine.length);
  } else if (isFirefox) {
    var callerLine = err.stack.split("\n")[3];
    var callerFuncEnd = callerLine.indexOf("@");
    return callerLine.slice(0, callerFuncEnd);
  } else {
    return "-";
  }
};

Log.backtrace = function(msg) {
  try { throw Error(''); } catch(e) { err = e; }
  var backtrace = err.stack.split("\n").slice(4).join("\n");
  console.log("BACKTRACE - msg\n" + backtrace);
};

Log.info = function(msg) {
  var functionName = Log._getCallerInfo();
  console.log("INFO - " + functionName + " - " + msg);
};

Log.warn = function(msg) {
  var functionName = Log._getCallerInfo();
  console.log("WARN - " + functionName + " - " + msg);
};

var i18nTFunc = undefined;

function t(key, opt) {
  if (i18nTFunc !== undefined) {
    return i18nTFunc(key, opt);
  } else {
    Log.warn("No translator func: key=" + key + ", opt=" + JSON.stringify(opt));
    return key;
  }
}

var CacheOp = function() {
  var self = this;

  self.CURR_USER_STATS = function() {
    return 'current_user_stats';
  };

  self.USER_STATS = function(uid) {
    return 'user_stats_' + uid;
  };

  self.INVITES = function() {
    return 'invites';
  };
    
  self.USERS = function() {
    return 'users';
  };

  self.COMPANIES = function() {
    return 'companies';
  };

  self.CUSTOMERS = function() {
    return 'customers';
  };

  self.INVOICES = function() {
    return 'invoices';
  };

  self.OFFERS = function() {
    return 'offers';
  };

  self.ITEM_GROUP_TEMPLATES = function() {
    return 'item_group_templates';
  };

  self._findArrayFieldIndex = function(arr, item, field) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i][field] === item[field]) {
        return i;
        break;
      };
    };
    return -1;    
  };

  self._arrayAddItem = function(arrayCacheKey, item) {
    cache.get(arrayCacheKey, function(items) {
      items.push(item);
      cache.set(arrayCacheKey, items);
    });
  };

  self._arrayUpdateItem = function(arrayCacheKey, item) {
    cache.get(arrayCacheKey, function(items) {
      var updateIndex = self._findArrayFieldIndex(items, item, '_id');
      if (updateIndex != -1) {
        items[updateIndex] = item;
        Log.info("array item at index=" + updateIndex + " in cacheKey=" + arrayCacheKey +
            " updated to " + JSON.stringify(item));
        cache.set(arrayCacheKey, items);
      } else {
        Log.warn("array item in cacheKey=" + arrayCacheKey +
            " not found matching " + JSON.stringify(item));
      };
    });
  };
  
  self._arrayRemoveItem = function(arrayCacheKey, item) {
    cache.get(arrayCacheKey, function(items) {
      var updateIndex = self._findArrayFieldIndex(items, item, '_id');
      if (updateIndex != -1) {
        items.splice(updateIndex, 1);
        Log.info("array item at index=" + updateIndex + " in cacheKey=" + arrayCacheKey +
            " removed");
        cache.set(arrayCacheKey, items);
      } else {
        Log.warn("array item in cacheKey=" + arrayCacheKey +
            " not found matching " + JSON.stringify(item));
      };
    });
  };

  self._arrayGetItem = function(arrayCacheKey, keyField, key, callback) {
    var items = cache.get(arrayCacheKey);
    if (items) {
      var matchItem = {};
      matchItem[keyField] = key;
      var i = self._findArrayFieldIndex(items, matchItem, keyField);
      if (i != -1) {
        var item = items[i];
        Log.info("array item at index=" + i + " in cacheKey=" + arrayCacheKey +
            " found " + JSON.stringify(item));
        callback(item);
      } else {
        Log.info("array item not found in cacheKey=" + arrayCacheKey);
        callback(undefined);
      }
    } else {
      Log.info("array items not cached for cacheKey=" + arrayCacheKey);
      callback(undefined);
    }
  };

  self.fetchCompanies = function() {
    return $.getJSON("/api/companies", function(data) {
      cache.set(self.COMPANIES(), data);
    });
  };

  self.getCompany = function(id, callback) {
    self._arrayGetItem(self.COMPANIES(), '_id', id, callback);
  };

  self.invalidateCompanies = function() {
    cache.del(self.COMPANIES());
  };
  
  self.updateCompany = function(company) {
    self._arrayUpdateItem(self.COMPANIES(), company);
  };

  self.addCompany = function(company) {
    self._arrayAddItem(self.COMPANIES(), company);
  };

  self.fetchItemGroupTemplates = function() {
    return $.getJSON("/api/itemGroupTemplates", function(data) {
      cache.set(self.ITEM_GROUP_TEMPLATES(), data);
    });
  };

  self.fetchItemGroupTemplatesPromise = function() {
    var deferred = $.Deferred();
    return $.getJSON("/api/itemGroupTemplates", function(data) {
      cache.set(self.ITEM_GROUP_TEMPLATES(), data);
      deferred.resolve(data);
    });
    return deferred.promise();
  };

  self.getItemGroupTemplate = function(id, callback) {
    self._arrayGetItem(self.ITEM_GROUP_TEMPLATES(), '_id', id, callback);
  };

  self.invalidateItemGroupTemplates = function() {
    cache.del(self.ITEM_GROUP_TEMPLATES());
  };
  
  self.updateItemGroupTemplate = function(groupTempl) {
    self._arrayUpdateItem(self.ITEM_GROUP_TEMPLATES(), groupTempl);
  };

  self.addItemGroupTemplate = function(groupTempl) {
    self._arrayAddItem(self.ITEM_GROUP_TEMPLATES(), groupTempl);
  };

  self.deleteItemGroupTemplate = function(groupTempl) {
    self._arrayRemoveItem(self.ITEM_GROUP_TEMPLATES(), groupTempl);
  };

  self.fetchCustomers = function(companyId) {
    return $.getJSON("/api/customers/" + companyId, function(data) {
      cache.set(self.CUSTOMERS(), data);
    });
  };

  self.fetchCustomersPromise = function(companyId) {
    var deferred = $.Deferred();
    $.getJSON("/api/customers/" + companyId).done(function(data) {
      cache.set(self.CUSTOMERS(), data);
      deferred.resolve(data);
    }).fail(function() {
      deferred.reject(data);
    });
    return deferred.promise();
  };

  self.getCustomer = function(id, callback) {
    self._arrayGetItem(self.CUSTOMERS(), '_id', id, callback);
  };

  self.invalidateCustomers = function() {
    cache.del(self.CUSTOMERS());
  };
  
  self.updateCustomer = function(customer) {
    self._arrayUpdateItem(self.CUSTOMERS(), customer);
  };

  self.addCustomer = function(customer) {
    self._arrayAddItem(self.CUSTOMERS(), customer);
  };

  self.fetchInvoicesPromise = function(companyId) {
    var deferred = $.Deferred();
    $.getJSON("/api/invoices/" + companyId).done(function(data) {
      cache.set(self.INVOICES(), data);
      deferred.resolve(data);
    }).fail(function() {
      deferred.reject(data);
    });
    return deferred.promise();
  };

  self.getInvoice = function(id, callback) {
    self._arrayGetItem(self.INVOICES(), '_id', id, callback);
  };

  self.getInvoicePromise = function(id) {
    var deferred = $.Deferred();
    self._arrayGetItem(self.INVOICES(), '_id', id, function(invoice) {
      if (invoice !== undefined) {
        deferred.resolve(invoice);
      } else {
        deferred.reject();
      }
    });
    return deferred.promise();
  };

  self.fetchInvoicePromise = function(id) {
    var deferred = $.Deferred();
    $.getJSON("/api/invoice/" + id).done(function(data) {
      deferred.resolve(data);
    }).fail(function(err) {
      deferred.reject(err);
    });
    return deferred.promise();
  };

  self.invalidateInvoices = function() {
    cache.del(self.INVOICES());
  };

  self.updateInvoice = function(invoice) {
    self._arrayUpdateItem(self.INVOICES(), invoice);
  };

  self.addInvoice = function(invoice) {
    self._arrayAddItem(self.INVOICES(), invoice);
  };

  self.fetchOffersPromise = function(companyId) {
    var deferred = $.Deferred();
    $.getJSON("/api/offers/" + companyId).done(function(data) {
      cache.set(self.OFFERS(), data);
      deferred.resolve(data);
    }).fail(function() {
      deferred.reject(data);
    });
    return deferred.promise();
  };

  self.getOffer = function(id, callback) {
    self._arrayGetItem(self.OFFERS(), '_id', id, callback);
  };

  self.getOfferPromise = function(id) {
    var deferred = $.Deferred();
    self._arrayGetItem(self.OFFERS(), '_id', id, function(offer) {
      if (offer !== undefined) {
        deferred.resolve(offer);
      } else {
        deferred.reject();
      }
    });
    return deferred.promise();
  };

  self.fetchOfferPromise = function(id) {
    var deferred = $.Deferred();
    $.getJSON("/api/offer/" + id).done(function(data) {
      deferred.resolve(data);
    }).fail(function(err) {
      deferred.reject(err);
    });
    return deferred.promise();
  };

  self.invalidateOffers = function() {
    cache.del(self.Offers());
  };

  self.updateOffer = function(offer) {
    self._arrayUpdateItem(self.OFFERS(), offer);
  };

  self.addOffer = function(offer) {
    self._arrayAddItem(self.OFFERS(), offer);
  };
};

var Cache = new CacheOp();

var browserNavigateBack = function() {
  Log.info("Forced backward navigation");
  history.go(-1);
};

var inheritInvoiceStyleModel = function(self) {
  self.invoiceStyleList = ko.observableArray(defaults.invoiceReportStyleList);

  self.getInvoiceStyleDesc = function(name) {
    return t("app.invoiceStyle.description", {context: name});
  }
};

var inheritInvoiceLngModel = function(self) {
  self.invoiceLngList = ko.observableArray(defaults.invoiceLngList);

  self.getInvoiceLngDesc = function(name) {
    return t("app.invoiceLng.description", {context: name});
  }
};

var inheritCurrencyModel = function(self, hasWildcard) {
  hasWildcard = typeof hasWildcard !== 'undefined' ? hasWildcard : false;
  // Copy currencyList array since we might add a wildcard
  self.currencyList = ko.observableArray(defaults.currencyList.slice(0));

  if (hasWildcard) {
    self.currencyList.unshift(defaults.currencyWildcard);
  }

  self.getCurrencyDesc = function(name) {
    return t("app.currency.description", {context: name});
  }
};

var UserDataModel = function(navBarUserName) {
  var self = this;

  self._id = ko.observable(cfg.user._id);
  self.name = ko.observable(navBarUserName());
  self.email = ko.observable(cfg.user.email);
  self.navBarUserName = navBarUserName;

  self.updateNavBarUsername = function() {
    self.navBarUserName(self.name());
  }

  self.toJSON = function() {
    var data = {
        _id: self._id(),
        name: self.name(),
        email: self.email(),
    };
    return data;
  };
};

var SettingsDataModel = function() {
  var self = this;

  self._id = ko.observable();
  self.activeCompanyId = ko.observable();
  self.license = ko.observable();

  self.setData = function(data) {
    self._id(data._id);
    self.activeCompanyId(data.activeCompanyId);
    self.license(data.license);

    for (var prop in data) {
      if (data.hasOwnProperty(prop)) {
        Log.info("Property " + prop + " = " + data[prop]);
      }
    }
  };

  self.setActiveCompanyId = function(id) {
    self.activeCompanyId(id);
  };
  
  self.toJSON = function() {
    var data = {
        _id: self._id(),
        activeCompanyId: self.activeCompanyId(),
        license: self.license(),
    };
    return data;
  };
};

var SettingsViewModel = function(currentView, settings, userData, activeCompanyId,
    setActiveCompanyId) {
  var self = this;

  self.currentView = currentView;
  self.activeCompanyId = activeCompanyId;
  self.setActiveCompanyId = setActiveCompanyId;

  self.settings = settings;
  self.user = userData;

  self.currentView.subscribe(function(newValue) {
    if (newValue == 'settings') {
      Log.info("SettingsViewModel - activated");
    }
  });

  self.enable = function() {
    self.activeCompanyId.subscribe(function(newValue) {
      Log.info("SettingsViewModel - Active company change detected: ID="
            + newValue);
      self.settings.setActiveCompanyId(newValue);
      self.saveSettings();
    });
  };

  self.setData = function(settings) {
    self.settings.setData(settings);
    self.setActiveCompanyId(settings.activeCompanyId);
  };

  self.saveSettings = function() {
    var ajaxData = self.settings.toJSON();
    var ajaxUrl = "/api/settings";
    Log.info("SettingsViewModel - saveSettings: AJAX PUT (url=" + ajaxUrl + "): JSON="
        + JSON.stringify(ajaxData));
    Notify_showSpinner(true, t("app.settings.saveTicker"));
    $.ajax({
      url : ajaxUrl,
      type : "PUT",
      contentType : "application/json",
      data : JSON.stringify(ajaxData),
      dataType : "json"
    }).done(function(data) {
      Log.info("SettingsViewModel - saveSettings: response: " + JSON.stringify(data));
      Notify_showMsg('success', t("app.settings.saveOk"));
    }).fail(function() {
      Log.info("SettingsViewModel - saveSettings: failed");
      Notify_showMsg('error', t("app.settings.saveNok"));
    }).always(function() {
      Notify_showSpinner(false);
    });
  };

  self.updateUser = function() {
    var ajaxData = self.user.toJSON();
    var ajaxUrl = "/api/user";
    Log.info("SettingsViewModel - updateUser: AJAX PUT (url=" + ajaxUrl + "): JSON="
        + JSON.stringify(ajaxData));
    Notify_showSpinner(true, t("app.settings.saveTicker", {context: "user"}));
    $.ajax({
      url : ajaxUrl,
      type : "PUT",
      contentType : "application/json",
      data : JSON.stringify(ajaxData),
      dataType : "json"
    }).done(function(data) {
      Log.info("SettingsViewModel - updateUser: response: " + JSON.stringify(data));
      Notify_showMsg('success', t("app.settings.saveOk", {context: "user"}));
      self.user.updateNavBarUsername();
    }).fail(function() {
      Log.info("SettingsViewModel - updateUser: failed");
      Notify_showMsg('error', t("app.settings.saveNok", {context: "user"}));
    }).always(function() {
      Notify_showSpinner(false);
    });
  };

  self.updatePassword = function(formElement) {
    var form = document.getElementById('local-pwd-update');
    Log.info("SettingsViewModel - updatePassword");
    var oldPwd = form.elements.oldPwd.value;
    var newPwd = form.elements.newPwd.value;
    var newPwd2 = form.elements.newPwd2.value;
    // First check data
    if (newPwd.length < defaults.minPwdLen) {
      Notify_showMsg('error', t("app.settings.pwdNok", {context: "tooShort", len: defaults.minPwdLen}));
    } else if (newPwd !== newPwd2) {
      Notify_showMsg('error', t("app.settings.pwdNok", {context: "repMismatch"}));
    } else {
      // OK
      Notify_showSpinner(true, t("app.settings.saveTicker", {context: "pwd"}));
      $.ajax({
        type: "POST",
        url: '/api/user-local-pwd-update',
        data: $("#local-pwd-update").serialize() // serializes the form's elements.
      }).done(function(data) {
        console.log("SettingsViewModel - updatePassword: Server OK: " + JSON.stringify(data));
        if (data.success) {
          Notify_showMsg('success', t("app.settings.pwdOk"));
        } else {
          Notify_showMsg('error', data.message);
        }
      }).fail(function(err) {
        console.log("SettingsViewModel - updatePassword: Server error: " + JSON.stringify(err));
        Notify_showMsg('error', t("app.settings.pwdNok", {context: "serverFailure"}));
      }).always(function() {
        Notify_showSpinner(false);
      });
    }

    // Prevent normal submit handler...
    return false;
  };

  self.invalidateCache = function() {
    var cacheRecords = cache.clear();
    Log.info("Cache cleared. Had " + cacheRecords + " records.");
  };
};

var CompanyViewModel = function() {
  var self = this;

  self.contactPaneLng = ko.observable(defaults.defaultLng);
  self.paymentOptPaneLng = ko.observable(defaults.defaultLng);
  self.customTextFieldsPaneLng = ko.observable(defaults.defaultLng);

  self.lngFields = [
    {name: "contact1Caption", lngSelector: "contactPaneLng"},
    {name: "contact2Caption", lngSelector: "contactPaneLng"},
    {name: "contact3Caption", lngSelector: "contactPaneLng"},
    {name: "contact1", lngSelector: "contactPaneLng"},
    {name: "contact2", lngSelector: "contactPaneLng"},
    {name: "contact3", lngSelector: "contactPaneLng"},
    {name: "payment1Caption", lngSelector: "paymentOptPaneLng"},
    {name: "payment2Caption", lngSelector: "paymentOptPaneLng"},
    {name: "payment3Caption", lngSelector: "paymentOptPaneLng"},
    {name: "payment1", lngSelector: "paymentOptPaneLng"},
    {name: "payment2", lngSelector: "paymentOptPaneLng"},
    {name: "payment3", lngSelector: "paymentOptPaneLng"},
    {name: "paymentFocus", lngSelector: "paymentOptPaneLng"},
    {name: "paymentCustomText", lngSelector: "paymentOptPaneLng"},
    {name: "vatNrCustomText", lngSelector: "customTextFieldsPaneLng"},
    {name: "reverseChargeText", lngSelector: "customTextFieldsPaneLng"}
  ];

  self.addLngField = function(field, lngSelector) {
    var fieldName = field;
    self[fieldName] = ko.pureComputed({
      read: function() {
        var lng = this[lngSelector]();
        return this[lng][fieldName]();
      },
      write: function(value) {
        var lng = this[lngSelector]();
        this[lng][fieldName](value);
      },
      owner: self
    });
  };

  self._id = ko.observable();
  self.uid = ko.observable();
  self.name = ko.observable();
  self.addr1 = ko.observable();
  self.addr2 = ko.observable();
  self.addr3 = ko.observable();
  self.defaultNumDaysUntilPayment = ko.observable();
  self.vatNr = ko.observable();
  self.orgNr = ko.observable();
  self.isValid = ko.observable();
  self.logo = ko.observable();
  self.nextCid = ko.observable();
  self.nextIid = ko.observable();
  self.nextOid = ko.observable();
  self.invoiceStyle = ko.observable();

  for (var i = 0; i < defaults.invoiceLngList.length; i++) {
    var lng = defaults.invoiceLngList[i]; 
    self[lng] = {};
    for (var j = 0; j < self.lngFields.length; j++) {
      var field = self.lngFields[j].name;
      self[lng][field] = ko.observable();
    }
  }
  for (var j = 0; j < self.lngFields.length; j++) {
    var field = self.lngFields[j].name;
    var fieldLngSelector = self.lngFields[j].lngSelector;
    self.addLngField(field, fieldLngSelector);
  }

  self.nameError = ko.observable(false);
  self.hasErrorCss = ko.pureComputed(function() {
    // return this.nameError() ? "has-error" : "";
    return this.nameError() ? "highlighterror" : "";
  }, self);

  self.setData = function(data) {
    self.contactPaneLng(defaults.defaultLng);
    self.paymentOptPaneLng(defaults.defaultLng);
    self.customTextFieldsPaneLng(defaults.defaultLng);
    self._id(data._id);
    self.uid(data.uid);
    self.name(data.name);
    self.addr1(data.addr1);
    self.addr2(data.addr2);
    self.addr3(data.addr3);
    for (var i = 0; i < defaults.invoiceLngList.length; i++) {
      var lng = defaults.invoiceLngList[i];
      if (data.hasOwnProperty(lng)) {
        for (var j = 0; j < self.lngFields.length; j++) {
          var field = self.lngFields[j].name;
          self[lng][field](data[lng][field]);
        }
      } else if (lng === 'sv') {
        // Support old company format
        for (var j = 0; j < self.lngFields.length; j++) {
          var field = self.lngFields[j].name;
          self[lng][field](data[field]);
        }
      }
    }

    self.defaultNumDaysUntilPayment(data.defaultNumDaysUntilPayment);
    self.vatNr(data.vatNr);
    self.orgNr(data.orgNr);
    self.isValid(data.isValid);
    self.logo(data.logo);
    self.nextCid(data.nextCid);
    self.nextIid(data.nextIid);
    self.nextOid(data.nextOid);
    if (data.invoiceStyle === undefined) {
      data.invoiceStyle = defaults.invoiceReportStyle;
    }
    self.invoiceStyle(data.invoiceStyle);
  };
  
  self.init = function() {
    var data = {
        _id : undefined,
        uid : undefined,
        name : "",
        addr1 : "",
        addr2 : "",
        addr3 : "",
        defaultNumDaysUntilPayment : 30,
        vatNr : "",
        orgNr : "",
        isValid : true,
        logo : undefined,
        nextCid : defaults.firstCid,
        nextIid : defaults.firstIid,
        nextOid : defaults.firstOid,
        invoiceStyle : defaults.invoiceReportStyle
    };
    for (var i = 0; i < defaults.invoiceLngList.length; i++) {
      var lng = defaults.invoiceLngList[i];
      data[lng] = {
        contact1Caption : t("app.company.defaultContact1Caption", {'lng': lng}),
        contact2Caption : t("app.company.defaultContact2Caption", {'lng': lng}),
        contact3Caption : t("app.company.defaultContact3Caption", {'lng': lng}),
        contact1 : "",
        contact2 : "",
        contact3 : "",
        payment1Caption : t("app.company.defaultPayment1Caption", {'lng': lng}),
        payment2Caption : t("app.company.defaultPayment2Caption", {'lng': lng}),
        payment3Caption : "",
        payment1 : "",
        payment2 : "",
        payment3 : "",
        paymentFocus : "1",
        paymentCustomText : t("app.company.defaultPaymentCustomText", {'lng': lng}),
        vatNrCustomText : t("app.company.defaultVatNrCustomText", {'lng': lng}),
        reverseChargeText : t("app.company.defaultReverseChargeCustomText", {'lng': lng}),
      };
    }
    self.setData(data);
  };
  
  self.init();
  
  self.setDefaultReverseChargeCustomText = function() {
    self.reverseChargeText(t("app.company.defaultReverseChargeCustomText", {'lng': self.customTextFieldsPaneLng()}));
  };

  self.setLogo = function(logo) {
    self.logo(logo);
  };

  self.updateServer = function(onCompletion) {
    if ((self._id() == undefined) && !self.isValid()) {
      Notify_showMsg('error', t("app.company.saveNok"));
      return;
    } else if (self.name().length == 0) {
      Notify_showMsg('error', t("app.company.saveNok", {context: "noName"}));
      self.nameError(true);
      return;
    }
    self.nameError(false);
    var isNew = (self._id() == undefined) ? true : false;
    Notify_showSpinner(true, t("app.company.saveTicker"));
    return $.ajax({
      url : "/api/company/" + self._id(),
      type : "PUT",
      contentType : "application/json",
      data : JSON.stringify(self.toJSON()),
      dataType : "json",
      success : function(data) {
        Log.info("updateServer: response: " + JSON.stringify(data));
        var tContext = "";
        if (!isNew) {
          tContext = (data.company.isValid) ? 'update' : 'delete';
        }
        Notify_showSpinner(false);
        Notify_showMsg('success', t("app.company.saveOk",
            {context: tContext, name: data.company.name}));
        self.uid(data.company.uid);
        self._id(data.company._id);
        self.logo(data.company.logo);
        self.isValid(data.company.isValid);
        if (onCompletion !== undefined) {
          onCompletion(data.company, isNew);
        }
      },
    });
  };

  self.toJSON = function() {
    var res = {
      _id : self._id(),
      uid : self.uid(),
      name : self.name(),
      addr1 : self.addr1(),
      addr2 : self.addr2(),
      addr3 : self.addr3(),
      sv: {},
      en: {},
      defaultNumDaysUntilPayment : self.defaultNumDaysUntilPayment(),
      vatNr : self.vatNr(),
      orgNr : self.orgNr(),
      isValid : self.isValid(),
      logo : self.logo(),
      nextCid : parseInt(self.nextCid()),
      nextIid : parseInt(self.nextIid()),
      nextOid : parseInt(self.nextOid()),
      invoiceStyle : self.invoiceStyle()
    };
    for (var i = 0; i < defaults.invoiceLngList.length; i++) {
      var lng = defaults.invoiceLngList[i];
      for (var j = 0; j < self.lngFields.length; j++) {
        var field = self.lngFields[j].name;
        res[lng][field] = self[lng][field]();
      }
    }
    return res;
  };
};

var CompanyListViewModel = function(currentView, activeCompanyId, activeCompany, companyList) {
  var self = this;

  self.currentView = currentView;

  self.currentView.subscribe(function(newValue) {
    if (newValue == 'companies') {
      Log.info("CompanyListViewModel - activated");
      self.populate();
    }
  });

  self.activeCompanyId = activeCompanyId;
  self.activeCompany = activeCompany;
  self.companyList = companyList;

  cache.on('set:' + Cache.COMPANIES(), function(companies, ttl) {
    Log.info("CompanyListViewModel - event - set:" + Cache.COMPANIES());
    Log.info("CompanyListViewModel - populate: Got " + companies.length
        + " companies");
    var mappedCompanies = $.map(companies, function(item) {
      var company = new CompanyViewModel();
      company.setData(item);
      return company;
    });
    self.companyList(mappedCompanies);
  });

  cache.on('update:' + Cache.COMPANIES(), function(companies, ttl) {
    Log.info("CompanyListViewModel - event - update:" + Cache.COMPANIES());
    var mappedCompanies = $.map(companies, function(item) {
      var company = new CompanyViewModel();
      company.setData(item);
      return company;
    });
    self.companyList(mappedCompanies);
  });

  cache.on('del:' + Cache.COMPANIES(), function() {
    Log.info("CompanyListViewModel - event - del:" + Cache.COMPANIES());
    self.companyList.removeAll();
  });

  self.populate = function(force) {
    force = typeof force !== 'undefined' ? force : false;
    if (force || !cache.get(Cache.COMPANIES())) {
      Notify_showSpinner(true);
      Cache.fetchCompanies().done(function() {
        Notify_showSpinner(false);
      }).fail(function() {
        Log.info("CompanyListViewModel - populate - failed");
        Notify_showSpinner(false);
        Notify_showMsg('error', t("app.companyList.getNok"));
      });
    } else {
      Log.info("CompanyListViewModel - populate - data is cached!");
    }
  };

  self.activateCompany = function(c) {
    Log.info("Activate company: name=" + c.name() + ", _id=" + c._id());
    self.activeCompanyId(c._id());
  };

  self.setActiveCompanyId = function(id) {
    Log.info("CompanyListViewModel - setActiveCompanyId: new id=" + id);
    self.activeCompanyId(id);
  };

  self.activeCompanyId.subscribe(function(newValue) {
    Log.info("CompanyListViewModel - activeCompanyId.subscribe: value="
        + newValue);
    self.updateActiveCompany(newValue, self.companyList());
  });

  self.companyList.subscribe(function(changes) {
    Log.info("CompanyListViewModel - companyList.subscribe changes="
        + JSON.stringify(changes));
    self.updateActiveCompany(self.activeCompanyId(), changes);
  });

  self.updateActiveCompany = function(id, companyList) {
    Log.info("CompanyListViewModel - updateActiveCompany: companyList.length="
            + companyList.length + ", id=" + id);
    for ( var i = 0; i < companyList.length; i++) {
      var c = companyList[i];
      Log.info("CompanyListViewModel - updateActiveCompany: i=" + i
          + ", name=" + c.name() + ", id=" + c._id());
      if (c._id() == id) {
        Log.info("CompanyListViewModel - updateActiveCompany: found "
            + name + " for id=" + id);
        self.activeCompany(c);
        break;
      };
    };
  };
};

var CompanyNewViewModel = function(currentView, activeCompanyId, activeCompany) {
  var self = this;

  self.data = new CompanyViewModel();
  self.companyLogoInput = ko.observable();

  self.currentView = currentView;
  self.activeCompanyId = activeCompanyId;
  self.activeCompany = activeCompany;

  inheritInvoiceStyleModel(self);
  inheritInvoiceLngModel(self);

  self.logoPath = ko.pureComputed(function() {
    var path = "";
    if (this.data._id() !== undefined && this.data.logo() !== undefined) {
      path = "/api/company_logo/" + this.data._id();
    }
    return path;
  }, self);

  self.currentView.subscribe(function(newValue) {
    self.data.init();
    var viewArray = newValue.split("/");
    if (viewArray[0] == 'company_new') {
      Log.info("CompanyNewViewModel - activated");
      self.companyLogoInput("");
      document.getElementById("companyLogoImg").src = "";
      self.data.init();
    } else if (viewArray[0] == 'company_show' && viewArray.length > 1) {
      var _id = viewArray[1];
      self.companyLogoInput("");
      Log.info("CompanyNewViewModel - activated - show #" + _id);
      self.getCompany(_id);
    }
  });
  
  self.getCompany = function(_id) {
    Cache.getCompany(_id, function(c) {
      if (c !== undefined) {
        self.data.setData(c);
      } else {
        Notify_showSpinner(true);
        $.getJSON(
            "/api/company/" + _id,
            function(company) {
              Log.info("Got company id=" + _id + ", data=" + JSON.stringify(company));
              self.data.setData(company);
              Notify_showSpinner(false);
            }).fail(function() {
              Log.info("CompanyNewViewModel - getCompany - failed");
              Notify_showSpinner(false);
              Notify_showMsg('error', t("app.company.getNok"));
            });
      }
    });
  };
  
  self.saveCompany = function() {
    self.data.updateServer(function(c, isNew) {
      Log.info("CompanyNewViewModel - saveCompany onCompletion: " + JSON.stringify(c) + ", activeId=" + self.activeCompanyId());
      var prevActiveCompanyId = self.activeCompanyId();
      if (prevActiveCompanyId == null) {
        Log.info("CompanyNewViewModel - No previosly active company, setting to new one - id=" + c._id);
        cache.del(Cache.CURR_USER_STATS());
        Cache.addCompany(c);
        self.activeCompanyId(c._id);
      } else if (c._id == self.activeCompanyId()) {
        Log.info("CompanyNewViewModel - active company updated - id=" + self.activeCompanyId());
        // c.name in this case is not a function. Fix done in activeCompany.subscribe()
        Cache.updateCompany(c);
        self.activeCompany(c);
      } else if (isNew) {
        Log.info("CompanyNewViewModel - New company added - id=" + c._id);
        cache.del(Cache.CURR_USER_STATS());
        Cache.addCompany(c);
      } else {
        Cache.updateCompany(c);
      }
    });
  };

  self.uploadLogo = function(formElement) {
    var _id = self.data._id();
    var form = document.getElementById('logoUploadForm');
    Log.info("CompanyNewViewModel - uploadLogo: companyId=" + _id + ", logo=" + form.elements.logo.value);
    Log.info("Form data: " + JSON.stringify(form.elements, null, 2));
    var submitForm = false;
    if (_id === undefined) {
      Notify_showMsg('error', t("app.company.uploadLogoNok", {context: "noId"}));
    } else if (form.elements.logo.value.length == 0) {
      Notify_showMsg('error', t("app.company.uploadLogoNok", {context: "noFile"}));
    } else {
      var formData = new FormData(form);
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) // Upload done!
        {          
          Log.info("Upload done: status=" + xhr.status + ", res=" + xhr.responseText);
          if (xhr.status == 200) { // Success
            var logoJson = JSON.parse(xhr.responseText);
            Log.info("Saved logo info: " + JSON.stringify(logoJson));
            self.data.setLogo(logoJson.logo);
            Cache.getCompany(self.data._id(), function(c) {
              c.logo = logoJson.logo;
              Cache.updateCompany(c);
              Notify_showMsg('success', t("app.company.uploadLogoOk"));
            });
          } else {
            Notify_showMsg('error', t("app.company.uploadLogoNok", {context: "serverFailure", "status": xhr.status}));
          }
        }
      }; 
      xhr.open('POST', "/api/company_logo/" + _id, true);
      xhr.send(formData);

      // Prevent normal submit handler...
      submitForm = false;
    }
    return submitForm;
  };

  self.setDefaultReverseChargeText = function() {
    self.data.setDefaultReverseChargeCustomText();
  };

  document.getElementById("companyLogoInput").onchange = function() {
    var reader = new FileReader();

    reader.onload = function (e) {
        // get loaded data and render thumbnail.
        document.getElementById("companyLogoImg").src = e.target.result;
    };

    // read the image file as a data URL.
    reader.readAsDataURL(this.files[0]);
  };
};

var CustomerViewModel = function() {
  var self = this;

  self._id = ko.observable();
  self.cid = ko.observable();
  self.uid = ko.observable();
  self.name = ko.observable();
  self.addr1 = ko.observable();
  self.addr2 = ko.observable();
  self.addr3 = ko.observable();
  self.phone1 = ko.observable();
  self.phone2 = ko.observable();
  self.phone3 = ko.observable();
  self.email = ko.observable();
  self.vatNr = ko.observable();
  self.noVat = ko.observable();
  self.useReverseCharge = ko.observable();
  self.contact = ko.observable();
  self.isValid = ko.observable();
  self.companyId = ko.observable();
  self.invoiceLng = ko.observable();
  self.currency = ko.observable();
  
  self.nameError = ko.observable(false);
  self.hasErrorCss = ko.pureComputed(function() {
    // return this.nameError() ? "has-error" : "";
    return this.nameError() ? "highlighterror" : "";
  }, self);

  self.setData = function(data) {
    self._id(data._id);
    self.cid(data.cid);
    self.uid(data.uid);
    self.name(data.name);
    self.addr1(data.addr1);
    self.addr2(data.addr2);
    self.addr3(data.addr3);
    self.phone1(data.phone1);
    self.phone2(data.phone2);
    self.phone3(data.phone3);
    self.email(data.email);
    self.vatNr(data.vatNr);
    self.noVat(data.noVat);
    self.useReverseCharge(data.useReverseCharge);
    self.contact(data.contact);
    self.isValid(data.isValid);
    self.companyId(data.companyId);
    if (data.invoiceLng === undefined) {
      data.invoiceLng = defaults.invoiceLng;
    }
    self.invoiceLng(data.invoiceLng);
    if (data.currency === undefined) {
      data.currency = defaults.defaultCurrency;
    }
    self.currency(data.currency);
  };

  self.init = function() {
    var data = {
      _id : undefined,
      cid : undefined,
      uid : undefined,
      companyId : undefined,
      name : "",
      addr1 : "",
      addr2 : "",
      addr3 : "",
      phone1 : "",
      phone2 : "",
      phone3 : "",
      email : "",
      vatNr : "",
      noVat : false,
      useReverseCharge : false,
      contact : "",
      isValid : true,
      invoiceLng : defaults.invoiceLng,
      currency : defaults.defaultCurrency,
    };
    self.setData(data);
  };
  
  self.init();

  self.setActiveCompanyId = function(companyId) {
    self.companyId(companyId);
  };

  self.updateServer = function() {
    if (self.companyId() == null) {
      Notify_showMsg('error', t("app.customer.saveNok", {context: "noCompany"}));
      return;
    } else if ((self._id() == undefined) && !self.isValid()) {
      Log.info("updateServer: Nothing to do (invalid entry without _id)");
      Notify_showMsg('error', t("app.customer.saveNok"));
      return;
    } else if (self.name().length == 0) {
      Notify_showMsg('error', t("app.customer.saveNok", {context: "noName"}));
      self.nameError(true);
      return;
    }
    self.nameError(false);
    var isNewCustomer = (self._id() == undefined) ? true : false;
    Notify_showSpinner(true, t("app.customer.saveTicker"));
    return $.ajax({
      url : "/api/customer/" + self._id(),
      type : "PUT",
      contentType : "application/json",
      data : JSON.stringify(self.toJSON()),
      dataType : "json",
      success : function(data) {
        Log.info("updateServer: response: " + JSON.stringify(data));
        var tContext = "";
        if (!isNewCustomer) {
          tContext = (data.customer.isValid) ? 'update' : 'delete';
        }
        Notify_showSpinner(false);
        Notify_showMsg('success', t("app.customer.saveOk",
            {context: tContext, cid: ""+data.customer.cid, name: data.customer.name}));
        self.cid(data.customer.cid);
        self.uid(data.customer.uid);
        self._id(data.customer._id);
        self.isValid(data.customer.isValid);
        if (isNewCustomer) {
          cache.del(Cache.CURR_USER_STATS());
          Cache.addCustomer(data.customer);
        } else {
          Cache.updateCustomer(data.customer);
        }
      },
    });
  };

  self.transferToCompany = function(destCompanyId) {
    if ((self._id() == undefined)) {
      Log.info("transferToCompany: Customer not saved");
      Notify_showMsg('error', t("app.customer.transferNok", {context: "noId"}));
      return;
    } else if (self.name().length == 0) {
      Notify_showMsg('error', t("app.customer.transferNok", {context: "noName"}));
      self.nameError(true);
      return;
    }
    self.nameError(false);

    var isNewCustomer = true; // New customer in destination company
    var newCustJson = self.toJSON();
    newCustJson.companyId = destCompanyId;
    delete newCustJson._id;

    Notify_showSpinner(true, t("app.customer.transferTicker"));
    return $.ajax({
      url : "/api/customer/undefined",
      type : "PUT",
      contentType : "application/json",
      data : JSON.stringify(newCustJson),
      dataType : "json",
      success : function(data) {
        Log.info("transferToCompany: response: " + JSON.stringify(data));
        var tContext = "";
        Notify_showSpinner(false);
        Notify_showMsg('success', t("app.customer.transferOk",
            {cid: ""+data.customer.cid}));
      },
    });
  };

  self.toJSON = function() {
    var res = {
      _id : self._id(),
      cid : self.cid(),
      uid : self.uid(),
      companyId : self.companyId(),
      name : self.name(),
      addr1 : self.addr1(),
      addr2 : self.addr2(),
      addr3 : self.addr3(),
      phone1 : self.phone1(),
      phone2 : self.phone2(),
      phone3 : self.phone3(),
      vatNr : self.vatNr(),
      email : self.email(),
      noVat : self.noVat(),
      useReverseCharge : self.useReverseCharge(),
      contact : self.contact(),
      isValid : self.isValid(),
      invoiceLng : self.invoiceLng(),
      currency : self.currency(),
    };
    return res;
  };
};

var CustomerListViewModel = function(currentView, activeCompanyId) {
  var self = this;

  self.currentView = currentView;
  self.activeCompanyId = activeCompanyId;

  self.currentView.subscribe(function(newValue) {
    if (newValue == 'customers') {
      Log.info("CustomerListViewModel - activated");
      self.populate();
    }
  });

  self.activeCompanyId.subscribe(function(newValue) {
    Log.info("CustomerListViewModel - activeCompanyId.subscribe: value="
        + newValue);
    if (self.currentView() == 'customers') {
      self.populate(true);
    } else {
      Cache.invalidateCustomers();
    }
  });

  // Customer part
  self.customerList = ko.observableArray();

  cache.on('set:' + Cache.CUSTOMERS(), function(customers, ttl) {
    Log.info("CustomerListViewModel - event - set:" + Cache.CUSTOMERS());
    var mappedCustomers = $.map(customers, function(item) {
      var customer = new CustomerViewModel();
      customer.setData(item);
      return customer;
    });
    self.customerList(mappedCustomers);
  });

  cache.on('update:' + Cache.CUSTOMERS(), function(customers, ttl) {
    Log.info("CustomerListViewModel - event - update:" + Cache.CUSTOMERS());
    var mappedCustomers = $.map(customers, function(item) {
      var customer = new CustomerViewModel();
      customer.setData(item);
      return customer;
    });
    self.customerList(mappedCustomers);
  });

  cache.on('del:' + Cache.CUSTOMERS(), function() {
    Log.info("CustomerListViewModel - event - del:" + Cache.CUSTOMERS());
    self.customerList.removeAll();
  });

  self.populate = function(force) {
    force = typeof force !== 'undefined' ? force : false;
    var companyId = self.activeCompanyId();
    if (companyId != null) {
      // Do nothing if object exists in cache
      if (force || !cache.get(Cache.CUSTOMERS())) {
        Notify_showSpinner(true);
        Cache.fetchCustomers(companyId).done(function() {
          Log.info("CustomerListViewModel - populate - success");
          Notify_showSpinner(false);
        }).fail(function() {
          Log.info("CustomerListViewModel - populate - failed");
          Notify_showSpinner(false);
          Notify_showMsg('error', t("app.customerList.getNok"));
        });
      } else {
        Log.info("CustomerListViewModel - populate - data is cached!");
      }
    } else {
      Notify_showMsg('info', t("app.customerList.getNok", {context: "noCompany"}));
      browserNavigateBack();
    }
  };
};

var CustomerNewViewModel = function(currentView, activeCompanyId, companyList) {
  var self = this;

  self.data = new CustomerViewModel();

  self.currentView = currentView;
  self.activeCompanyId = activeCompanyId;
  self.isExtraOptVisible = ko.observable(false);
  self.companyList = companyList;
  self.transferDestCompany = ko.observable();

  inheritInvoiceLngModel(self);
  inheritCurrencyModel(self);
  
  self.currentView.subscribe(function(newValue) {
    self.data.init();
    var viewArray = newValue.split("/");
    if (viewArray[0] == 'customer_new') {
      Log.info("CustomerNewViewModel - activated");
      self.isExtraOptVisible(false);
      if (self.activeCompanyId() != null) {
        self.data.init();
        self.data.setActiveCompanyId(self.activeCompanyId());
      } else {
        Notify_showMsg('info', t("app.customer.newNok", {context: "noCompany"}));
        browserNavigateBack();
      }
    } else if (viewArray[0] == 'customer_show' && viewArray.length > 1) {
      var _id = viewArray[1];
      Log.info("CustomerNewViewModel - activated - show #" + _id);
      self.getCustomer(_id);
    }
  });
  
  self.getCustomer = function(_id) {
    Cache.getCustomer(_id, function(c) {
      if (c !== undefined) {
        self.data.setData(c);
      } else {
        Notify_showSpinner(true);
        $.getJSON(
            "/api/customer/" + _id,
            function(customer) {
              Log.info("Got customer id=" + _id + ", data=" + JSON.stringify(customer));
              self.data.setData(customer);
              Notify_showSpinner(false);
            }).fail(function() {
              Log.info("CustomerNewViewModel - getCustomer - failed");
              Notify_showSpinner(false);
              Notify_showMsg('error', t("app.customer.getNok"));
            });
      }
    });
  };

  self.toggleIsExtraOptVisible = function() {
    var newState = !self.isExtraOptVisible();
    self.isExtraOptVisible(newState);
  }
  
  self.transferCustomer = function() {
    var destCompanyId = self.transferDestCompany()._id();
    if (destCompanyId == self.activeCompanyId()) {
      Notify_showMsg('error', t("app.customer.transferNok", {context: "activeCompanySelected"}));
    } else {
      self.data.transferToCompany(destCompanyId);
    }
  };

  self.saveCustomer = function() {
    self.data.updateServer();
  };
};

var InvoiceItemGroupTemplatesViewModel = function(currentView) {
  var self = this;

  self.currentView = currentView;

  self.currentView.subscribe(function(newValue) {
    if (newValue == 'invoice_item_group_templates') {
      Log.info("InvoiceItemGroupTemplatesViewModel - activated");
      self.populate();
    }
  });

  self.groupList = ko.observableArray();
  self.isLockedDummy = ko.observable(false);

  cache.on('set:' + Cache.ITEM_GROUP_TEMPLATES(), function(groupTemplates, ttl) {
    Log.info("InvoiceItemGroupTemplatesViewModel - event - set:" + Cache.ITEM_GROUP_TEMPLATES());
    Log.info("InvoiceItemGroupTemplatesViewModel - populate: Got " + groupTemplates.length
        + " group templates");
    var mappedGroupTemplates = $.map(groupTemplates, function(item) {
      var group = new InvoiceItemGroupViewModel(false, undefined, self.isLockedDummy);
      group.setData(item);
      return group;
    });
    self.groupList(mappedGroupTemplates);
  });

  cache.on('update:' + Cache.ITEM_GROUP_TEMPLATES(), function(groupTemplates, ttl) {
    Log.info("InvoiceItemGroupTemplatesViewModel - event - update:" + Cache.ITEM_GROUP_TEMPLATES());
    var mappedGroupTemplates = $.map(groupTemplates, function(item) {
      var group = new InvoiceItemGroupViewModel(false, undefined, self.isLockedDummy);
      group.setData(item);
      return group;
    });
    self.groupList(mappedGroupTemplates);
  });

  cache.on('del:' + Cache.ITEM_GROUP_TEMPLATES(), function() {
    Log.info("InvoiceItemGroupTemplatesViewModel - event - del:" + Cache.ITEM_GROUP_TEMPLATES());
    self.groupList.removeAll();
  });

  self.populate = function(force) {
    force = typeof force !== 'undefined' ? force : false;
    if (force || !cache.get(Cache.ITEM_GROUP_TEMPLATES())) {
      Notify_showSpinner(true);
      Cache.fetchItemGroupTemplates().done(function() {
        Notify_showSpinner(false);
      }).fail(function() {
        Log.info("InvoiceItemGroupTemplatesViewModel - populate - failed");
        Notify_showSpinner(false);
        Notify_showMsg('error', t("app.groupTemplates.getNok"));
      });
    } else {
      Log.info("InvoiceItemGroupTemplatesViewModel - populate - data is cached!");
    }
  };

  self.deleteGroup = function(group) {
    group.updateServerDelete();
    self.groupList.destroy(group);
  };

  self.newGroup = function() {
    var group = new InvoiceItemGroupViewModel(false, undefined, self.isLockedDummy);
    group.initNew();
    group.isEditMode(true);
    self.groupList.push(group);
  };
};

// Trick for doing classmethods...
function ReportOps(){};
ReportOps.downloadDoc = function(url) {
  Log.info("downloadDoc - url=" + url);
  Notify_showSpinner(true);
  try {
    var child = window.open(url);
    $(child).ready(function() {
      Log.info("downloadDoc - Download done!");
      Notify_showSpinner(false);
    });
    child.focus();
  } catch (e) {
    Log.info("downloadDoc - Failed! error=" + JSON.stringify(e));
    Notify_showSpinner(false);
  }
};

ReportOps.printDoc = function(id, docType) {
  if (docType == 'invoice') {
    ReportOps.printInvoice(id);
  } else if (docType == 'offer') {
    ReportOps.printOffer(id);
  } else {
    Log.info("printDoc - failure, unknown docType=" + docType + " for id=" + id);
  }
};

ReportOps.printInvoice = function(id, opts) {
  opts = typeof opts !== 'undefined' ? opts : {};
  // Set default parameters
  if (!opts.isReminder) {
    opts.isReminder = false;
  }
  Log.info("printInvoice - id=" + id + ", opts=" + JSON.stringify(opts));
  if (id !== undefined) {
    var reqUrl = "/api/invoiceReport/" + id + "/" + opts.isReminder;
    ReportOps.downloadDoc(reqUrl);
  } else {
    Log.info("printInvoice - failure, undefined id");
  }
};

ReportOps.printOffer = function(id, opts) {
  opts = typeof opts !== 'undefined' ? opts : {};
  Log.info("printOffer - id=" + id + ", opts=" + JSON.stringify(opts));
  if (id !== undefined) {
    var reqUrl = "/api/offerReport/" + id;
    ReportOps.downloadDoc(reqUrl);
  } else {
    Log.info("printOffer - failure, undefined id");
  }
};

var InvoiceItemGroupViewModel = function(mayHaveInvoiceItems, currency, isLocked) {
  var self = this;
  self.mayHaveInvoiceItems = mayHaveInvoiceItems;
  self.nameError = ko.observable(false);
  self.isEditMode = ko.observable(false);

  self._id = ko.observable();
  self.uid = ko.observable();
  self.name = ko.observable();
  self.title = ko.observable();
  self.isValid = ko.observable();
  self.isQuickButton = ko.observable();
  self.isTextOnlyDefault = ko.observable();

  self.titleExtraField = ko.observable("");
  self.descColLbl = ko.observable();
  self.priceColLbl = ko.observable();
  self.countColLbl = ko.observable();
  self.discountColLbl = ko.observable();
  self.vatColLbl = ko.observable();
  self.totalColLbl = ko.observable();

  self.hasTitleExtraField = ko.observable();
  self.hasDesc = ko.observable();
  self.hasPrice = ko.observable();
  self.hasCount = ko.observable();
  self.hasDiscount = ko.observable();
  self.negateDiscount = ko.observable();
  self.hasVat = ko.observable();
  self.hasTotal = ko.observable();

  if (self.mayHaveInvoiceItems) {
    self.activeCurrency = currency;
    self.invoiceItems = ko.observableArray();
  }

  isLocked.subscribe(function(goingToLock) {
    if (goingToLock && self.isEditMode()) {
      Log.info("item group name=" + self.name() +
        " detected invoice lock when in edit mode. Disabling edit mode.");
      self.isEditMode(false);
    }
  });
  
  self.setData = function(data) {
    self.isEditMode(false);
    self._id(data._id);
    self.uid(data.uid);
    self.name(data.name);
    self.title(data.title);
    self.isValid(data.isValid);
    self.isQuickButton(data.isQuickButton);
    if (data.isTextOnlyDefault) {
      self.isTextOnlyDefault(data.isTextOnlyDefault);
    } else {
      self.isTextOnlyDefault(false);
    }

    self.titleExtraField(data.titleExtraField);
    self.hasTitleExtraField(data.hasTitleExtraField);

    self.descColLbl(data.descColLbl);
    self.priceColLbl(data.priceColLbl);
    self.countColLbl(data.countColLbl);
    self.discountColLbl(data.discountColLbl);
    self.vatColLbl(data.vatColLbl);
    self.totalColLbl(data.totalColLbl);

    self.hasDesc(data.hasDesc);
    self.hasPrice(data.hasPrice);
    self.hasCount(data.hasCount);
    self.hasDiscount(data.hasDiscount);
    self.negateDiscount(data.negateDiscount);
    self.hasVat(data.hasVat);
    self.hasTotal(data.hasTotal);

    if (self.mayHaveInvoiceItems) {
      self.invoiceItems.removeAll();
      if (data.invoiceItems) {
        for ( var i = 0; i < data.invoiceItems.length; i++) {
          if (data.invoiceItems[i].isValid) {
            Log.info("Push item i=" + i + " desc=" + data.invoiceItems[i].description);
            self.invoiceItems.push(new InvoiceItemViewModel(data.invoiceItems[i], self));
          } else {
            Log.info("Skip invalid item i=" + i + " desc=" + data.invoiceItems[i].description);
          };
        };
      } else {
        Log.info("No invoice items in group name=" + data.name);
      }
    }
  };

  self.initNew = function() {
    var data = {
      name: "",
      title: "",
      isValid: true,
      isQuickButton: false,
      isTextOnlyDefault: false,
      titleExtraField: "",
      hasTitleExtraField: false,
      descColLbl: t("app.groupTemplates.descCol"),
      priceColLbl: t("app.groupTemplates.priceCol"),
      countColLbl: t("app.groupTemplates.countCol"),
      discountColLbl: t("app.groupTemplates.discountCol"),
      vatColLbl: t("app.groupTemplates.vatCol"),
      totalColLbl: t("app.groupTemplates.totalCol"),
      hasDesc: true,
      hasPrice: true,
      hasCount: true,
      hasDiscount: true,
      negateDiscount: false,
      hasVat: true,
      hasTotal: true,
    };
    self.setData(data);
  };

  if (self.mayHaveInvoiceItems) {
    self.numInvoiceItems = ko.pureComputed(function() {
      var sum = 0;
      for ( var i = 0; i < this.invoiceItems().length; i++) {
        if (this.invoiceItems()[i].isValid()) {
          sum += 1;
        };
      }
      return sum;
    }, this);

    self.numInvoiceItemsText = ko.pureComputed(function() {
      return t("app.invoice.groupNumInvoiceItemsText", {count: self.numInvoiceItems()});
    }, this);

    self.totalExclVat = ko.pureComputed(function() {
      var sum = 0;
      for ( var i = 0; i < this.invoiceItems().length; i++) {
        if (this.invoiceItems()[i].isValid()) {
          sum += this.invoiceItems()[i].total();
        }
      }
      return sum;
    }, this);
    
    self.totalInclVat = ko.pureComputed(function() {
      var sum = 0;
      for ( var i = 0; i < this.invoiceItems().length; i++) {
        if (this.invoiceItems()[i].isValid()) {
          var vat = parseFloat(this.invoiceItems()[i].vat()) / 100.0;
          sum += this.invoiceItems()[i].total() * (1 + vat);
        }
      }
      return sum;
    }, this);

    self.totalExclVatStr = ko.pureComputed(function() {
      return Util.formatCurrency(self.totalExclVat(), {currencyStr: self.activeCurrency()});
    }, self);

    self.totalInclVatStr = ko.pureComputed(function() {
      return Util.formatCurrency(self.totalInclVat(), {currencyStr: self.activeCurrency()});
    }, self);

    self.newInvoiceItem = function() {
      var data = {
          description : "",
          price : 0.0,
          count : 1.0,
          vat : 25,
          discount : 0.0,
          isValid : true,
          isTextOnly: self.isTextOnlyDefault(),
        };
      self.invoiceItems.push(new InvoiceItemViewModel(data, self));
      Log.info("Added new invoice item to group=" + self.name() +
          ". #items=" + self.invoiceItems().length + " (after)");
    };
    
    self.deleteInvoiceItem = function(item) {
      item.isValid(false);
      self.invoiceItems.destroy(item);
    };
  }

  self.toggleEditMode = function() {
    var newEditMode = !self.isEditMode();
    Log.info("Edit toggled for group=" + self.name() + ", isEditMode=" +
        newEditMode + " (new)");
    self.isEditMode(newEditMode);
  };

  self.updateServer = function() {
    if ((self._id() === undefined) && !self.isValid()) {
      Notify_showMsg('error', t("app.groupTemplates.saveNok"));
      return;
    } else if (self.name().length == 0) {
      Notify_showMsg('error', t("app.groupTemplates.saveNok", {context: "noName"}));
      self.nameError(true);
      return;
    }
    self.nameError(false);
    var isNew = (self._id() == undefined) ? true : false;
    Notify_showSpinner(true, t("app.groupTemplates.saveTicker"));
    return $.ajax({
      url : "/api/itemGroupTemplate/" + self._id(),
      type : "PUT",
      contentType : "application/json",
      data : JSON.stringify(self.toJSON()),
      dataType : "json",
      success : function(data) {
        Log.info("updateServer: response: " + JSON.stringify(data));
        var tContext = "";
        var isDelete = !isNew && !data.groupTempl.isValid;
        if (!isNew) {
          tContext = isDelete ? 'delete' : 'update';
        }
        Notify_showSpinner(false);
        Notify_showMsg('success', t("app.groupTemplates.saveOk",
            {context: tContext, name: data.groupTempl.name}));
        self.uid(data.groupTempl.uid);
        self._id(data.groupTempl._id);
        self.isValid(data.groupTempl.isValid);
        if (isNew) {
          Cache.addItemGroupTemplate(data.groupTempl);
        } else if (isDelete) {
          Cache.deleteItemGroupTemplate(data.groupTempl);
        } else {
          Cache.updateItemGroupTemplate(data.groupTempl);
        };
      },
    });
  };

  self.updateServerForceNew = function() {
    self._id(undefined);
    self.updateServer();
  };

  self.updateServerDelete = function() {
    self.isValid(false);
    if (self._id() !== undefined) {
      self.updateServer();
    }
  };

  self.toJSON = function() {
    var res = {
      _id : self._id(),
      uid : self.uid(),
      name : self.name(),
      title : self.title(),
      isValid : self.isValid(),
      isQuickButton : self.isQuickButton(),
      isTextOnlyDefault : self.isTextOnlyDefault(),
      titleExtraField : self.titleExtraField(),
      hasTitleExtraField : self.hasTitleExtraField(),
      descColLbl : self.descColLbl(),
      priceColLbl : self.priceColLbl(),
      countColLbl : self.countColLbl(),
      discountColLbl : self.discountColLbl(),
      vatColLbl : self.vatColLbl(),
      totalColLbl : self.totalColLbl(),
      hasDesc : self.hasDesc(),
      hasPrice : self.hasPrice(),
      hasCount : self.hasCount(),
      hasDiscount : self.hasDiscount(),
      negateDiscount : self.negateDiscount(),
      hasVat : self.hasVat(),
      hasTotal : self.hasTotal(),
    };
    if (self.mayHaveInvoiceItems) {
      var items = [];
      for ( var i = 0; i < self.invoiceItems().length; i++) {
        items.push(self.invoiceItems()[i].toJSON());
      }
      res.invoiceItems = items;
      res.totalExclVat = self.totalExclVat();
      res.totalInclVat = self.totalInclVat();
    }
    return res;
  };
};

var InvoiceItemViewModel = function(data, parent) {
  var self = this;
  self.activeCurrency = parent.activeCurrency;
  self.hasDesc = parent.hasDesc;
  self.hasPrice = parent.hasPrice;
  self.hasCount = parent.hasCount;
  self.hasDiscount = parent.hasDiscount;
  self.negateDiscount = parent.negateDiscount;
  self.hasVat = parent.hasVat;
  self.hasTotal = parent.hasTotal;

  self.description = ko.observable(data.description);
  self.price = ko.observable(data.price);
  self.count = ko.observable(data.count);
  self.vat = ko.observable(data.vat);
  self.discount = ko.observable(data.discount);
  self.isValid = ko.observable(data.isValid);
  self.isTextOnly = ko.observable(data.isTextOnly);
  self.total = ko.pureComputed(function() {
    var total = 0;
    if (this.hasTotal() && !this.isTextOnly()) {
      var count = this.hasCount()?parseFloat(this.count()):1.0;
      var price = this.hasPrice()?parseFloat(this.price()):1.0;
      var discount = (this.hasDiscount()?parseFloat(this.discount()):0.0) / 100.0;
      if (this.negateDiscount()) {
        discount = -discount;
      }
      total = count * price * (1.0 - discount);
    }
    return total;
  }, self);

  self.totalStr = ko.pureComputed(function() {
    var str = "";
    if (self.hasTotal()) {
      str = Util.formatCurrency(self.total(), {currencyStr: self.activeCurrency()});
    }
    return str;
  }, self);
  
  self.descriptionNumRows = ko.pureComputed(function() {
    var numRows = 1;
    if (this.isTextOnly()) {
      numRows = 3;
    }
    return numRows;
  }, self);

  self.descriptionColspan = ko.pureComputed(function() {
    var colspan = 1;
    if (this.isTextOnly()) {
      colspan = 6;
    }
    return colspan;
  }, self);

  self.toJSON = function() {
    var res = {
      description : self.description(),
      price : self.price(),
      count : self.count(),
      vat : self.vat(),
      discount : self.discount(),
      total : self.total(),
      isTextOnly : self.isTextOnly(),
      hasDesc : self.hasDesc(),
      hasPrice : self.hasPrice(),
      hasCount : self.hasCount(),
      hasVat : self.hasVat(),
      hasDiscount : self.hasDiscount(),
      hasTotal : self.hasTotal(),
      isValid : self.isValid()
    };
    return res;
  };
};

var InvoiceDataViewModel = function() {
  var self = this;
  self._id = ko.observable();
  self.docType = ko.observable();
  self.docNr = ko.observable();
  self.uid = ko.observable();
  self.companyId = ko.observable();
  self.company = ko.observable();
  self.isValid = ko.observable();
  self.isPaid = ko.observable();
  self.isCanceled = ko.observable();
  self.isCredit = ko.observable();
  self.isLocked = ko.observable();
  self.customer = ko.observable();
  self.yourRef = ko.observable();
  self.ourRef = ko.observable();
  self.date = ko.observable();
  self.daysUntilPayment = ko.observable();
  self.projId = ko.observable();
  self.invoiceItemGroups = ko.observableArray();
  self.invoiceItems = ko.observableArray();
  self.customerAddrIsEditMode = ko.observable(false);
  self.extraOptionExpanded = ko.observable(false);

  self.currency = ko.pureComputed(function() {
    if ((self.customer() === undefined) || (self.customerMirror_currency() === undefined)) {
      return defaults.defaultCurrency;
    } else {
      return self.customerMirror_currency();
    }
  }, self);

  var registerMirrors = function(mirrorFieldPrefix, fields, writeBackFunc) {
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      self[mirrorFieldPrefix + field] = ko.observable();
      // Subscribe to mirror field changes to write-back changes to source field
      self[mirrorFieldPrefix + field].subscribe(
        writeBackFunc.bind(null, field));
    }
  };

  var registerCompanyLngMirrors = function(mirrorFieldPrefix, fields) {
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      self[mirrorFieldPrefix + field] = ko.pureComputed({
        read: function(srcField) {
          var lngField = self[self.customerFieldMirrorPrefix + 'invoiceLng']();
          var srcFieldName = "company()." + lngField + "." + srcField;
          if (self.company() === undefined) {
            Log.info("Mirror read of " + srcFieldName + " failed. company undefined!");
          } else if (!self.company().hasOwnProperty(lngField)) {
            Log.info("Mirror read of " + srcFieldName + " failed. company." + lngField + " not present!");
          } else {
            var value = self.company()[lngField][srcField];
            Log.info("Mirror read of " + srcFieldName + " returned " + value);
            return value;
          }
          return undefined;
        }.bind(self, field),
        write: function(dstField, value) {
          var lngField = self[self.customerFieldMirrorPrefix + 'invoiceLng']();
          var dstFieldName = "company()." + lngField + "." + dstField;
          if (self.company() === undefined) {
            Log.info("Mirror write to " + dstFieldName + " failed. company undefined!");
          } else if (!self.company().hasOwnProperty(lngField)) {
            Log.info("Mirror write to " + dstFieldName + " failed. company." + lngField + " not present!");
          } else {
            Log.info("Mirror write-back of " + dstFieldName + " set to " + value);
            self.company()[lngField][dstField] = value;
          }
        }.bind(self, field),
        owner: self
      });
    }
  };

  self.updateMirrors = function(mirrorFieldPrefix, fields, sourceData) {
    if (sourceData !== undefined) {
      for (var i = 0; i < fields.length; i++) {
        var field = fields[i];
        var mirrorField = mirrorFieldPrefix + field;
        Log.info("Mirrored field " + mirrorField + " set to " + sourceData[field]);
        self[mirrorField](sourceData[field]);
      }
    }
  };

  // Mirror customer fields
  self.customerFieldMirrorPrefix = 'customerMirror_';
  self.customerFieldMirror = [
    'useReverseCharge',
    'noVat',
    'name',
    'addr1',
    'addr2',
    'addr3',
    'invoiceLng',
    'currency'
  ];

  var customerFieldMirrorUpdate = function(field, val) {
    if (self.customer() !== undefined) {
      Log.info("Mirror updated, write-back customer." + field + " = " + val);
      self.customer()[field] = val;
    }
  };

  registerMirrors(self.customerFieldMirrorPrefix,
    self.customerFieldMirror, customerFieldMirrorUpdate);

  // Mirror company fields
  self.companyFieldMirrorPrefix = 'companyMirror_';
  self.companyFieldMirror = [
    'invoiceStyle'
  ];

  var companyFieldMirrorUpdate = function(field, val) {
    if (self.company() !== undefined) {
      Log.info("Mirror updated, write-back company." + field + " = " + val);
      self.company()[field] = val;
    }
  };

  registerMirrors(self.companyFieldMirrorPrefix,
    self.companyFieldMirror, companyFieldMirrorUpdate);

  self.companyLngFieldMirrorPrefix = 'companyLngMirror_';
  self.companyLngFieldMirror = [
    'reverseChargeText',
    'vatNrCustomText',
    'paymentCustomText',
    'payment1Caption',
    'payment2Caption',
    'payment3Caption',
    'payment1',
    'payment2',
    'payment3',
    'paymentFocus'
  ];

  registerCompanyLngMirrors(self.companyLngFieldMirrorPrefix,
    self.companyLngFieldMirror);

  self.hasVat = ko.pureComputed(function() {
    if (self[self.customerFieldMirrorPrefix + 'useReverseCharge']() ||
        self[self.customerFieldMirrorPrefix + 'noVat']()) {
      return false;
    } else {
      return true;
    }
  }, self);

  self.setCustomer = function(data) {
    // Use copy to not update cached version of customer...
    var customerCopy = ko.toJS(data);
    self.customer(customerCopy);
    // Updated mirrored data
    self.updateMirrors(self.customerFieldMirrorPrefix,
      self.customerFieldMirror, customerCopy);
    self.customerAddrIsEditMode(false);
  };

  self.setCompany = function(data) {
    // Use copy to not update cached version of company...
    var companyCopy = ko.toJS(data);
    Log.info("Invoice company set to: " + JSON.stringify(companyCopy));
    self.company(companyCopy);
    // Updated mirrored data
    self.updateMirrors(self.companyFieldMirrorPrefix,
      self.companyFieldMirror, companyCopy);
    var lng = self.customerMirror_invoiceLng();
    if (companyCopy !== undefined) {
      self.updateMirrors(self.companyLngFieldMirrorPrefix,
        self.companyLngFieldMirror, companyCopy[lng]);
    }
  };

  self.setData = function(newData) {
    self.customerAddrIsEditMode(false);
    self.extraOptionExpanded(false);
    self._id(newData._id);
    self.docType(newData.docType);
    if (newData.hasOwnProperty('iid') && !newData.hasOwnProperty('docNr')) {
      // Support legacy invoices
      self.docNr(newData.iid);
    } else {
      self.docNr(newData.docNr);
    }
    self.uid(newData.uid);
    self.companyId(newData.companyId);
    self.setCompany(newData.company);
    self.isValid(newData.isValid);
    self.isCanceled(newData.isCanceled);
    self.isPaid(newData.isPaid);
    self.isCredit(newData.isCredit);
    self.isLocked(newData.isLocked);
    self.setCustomer(newData.customer);
    self.yourRef(newData.yourRef);
    self.ourRef(newData.ourRef);
    self.date(newData.date);
    self.daysUntilPayment(newData.daysUntilPayment);
    self.projId(newData.projId);

    self.invoiceItemGroups.removeAll();

    for ( var i = 0; i < newData.invoiceItemGroups.length; i++) {
      if (newData.invoiceItemGroups[i].isValid) {
        Log.info("Push item group i=" + i + " name=" + newData.invoiceItemGroups[i].name);
        var group = new InvoiceItemGroupViewModel(true, self.currency, self.isLocked);
        group.setData(newData.invoiceItemGroups[i]);
        self.invoiceItemGroups.push(group);
      } else {
        Log.info("Skip invalid item group i=" + i + " name=" + newData.invoiceItemGroups[i].name);
      };
    };
  };

  self.setCompanyId = function(companyId) {
    self.companyId(companyId);
  };

  self.init = function(docType, defaultNumDaysUntilPayment) {
    var data = {
      _id : undefined,
      docType: docType,
      docNr : undefined,
      uid : undefined,
      companyId : undefined,
      company: undefined,
      customer : undefined,
      yourRef : "",
      ourRef : "",
      // Initialize to current date
      date : new Date().toISOString().split("T")[0],
      daysUntilPayment : defaultNumDaysUntilPayment,
      projId : "",
      isLocked : false,
      isCanceled : false,
      isPaid : false,
      isCredit : false,
      isValid : true,
      invoiceItemGroups : []
    };
    self.setData(data);
  };

  self.init();
  
  self.totalExclVat = ko.pureComputed(function() {
    var sum = 0;
    for ( var i = 0; i < self.invoiceItemGroups().length; i++) {
      if (self.invoiceItemGroups()[i].isValid()) {
        sum += self.invoiceItemGroups()[i].totalExclVat();
      }
    }
    if (self.isCredit()) {
      sum = -sum;
    }
    return sum;
  }, this);
  
  self.totalInclVat = ko.pureComputed(function() {
    var sum = 0;
    for ( var i = 0; i < self.invoiceItemGroups().length; i++) {
      if (self.invoiceItemGroups()[i].isValid()) {
        sum += self.invoiceItemGroups()[i].totalInclVat();
      }
    }
    if (self.isCredit()) {
      sum = -sum;
    }
    return sum;
  }, this);
  
  self.totalExclVatStr = ko.pureComputed(function() {
    return Util.formatCurrency(self.totalExclVat(), {currencyStr: self.currency()});
  }, self);

  self.totalInclVatStr = ko.pureComputed(function() {
    return Util.formatCurrency(self.totalInclVat(), {currencyStr: self.currency()});
  }, self);

  self.lastPaymentDate = ko.pureComputed(function() {
    var invoiceDate = new Date(self.date());
    return Util.dateAddDays(invoiceDate, self.daysUntilPayment());
  }, this);

  self.forceMarkAsNew = function() {
    self._id(undefined);
    self.docNr(undefined);
  };

  self.addGroup = function(g) {
    var groupToAdd = new InvoiceItemGroupViewModel(true, self.currency, self.isLocked);
    groupToAdd.setData(g);
    groupToAdd.newInvoiceItem();
    self.invoiceItemGroups.push(groupToAdd);
  };

  self.deleteGroup = function(group) {
    Log.info("Delete group name=" + group.name());
    group.isValid(false);
    self.invoiceItemGroups.destroy(group);
  };

  self.toggleCustomerAddrEditMode = function() {
    var newEditMode = !self.customerAddrIsEditMode();
    Log.info("Edit mode toggled for customer address isEditMode=" +
        newEditMode + " (new)");
    self.customerAddrIsEditMode(newEditMode);
  };

  self.toggleExtraOptionExpanded = function() {
    var newMode = !self.extraOptionExpanded();
    Log.info("Expanded toggled for extra options extraOptionExpanded=" +
        newMode + " (new)");
    self.extraOptionExpanded(newMode);
  };

  var printGroupArray = function(prefix, array, idx) {
      var itemStr = "";
      for (var i = 0; i < array.length; i++) {
        if (idx !== undefined && i == idx) {
          itemStr = itemStr + "[";
        }
        itemStr = itemStr + array[i].name();
        if (idx !== undefined && i == idx) {
          itemStr = itemStr + "]";
        }

        itemStr = itemStr + ", ";
      }
      console.log(prefix + ': ' + itemStr);
    };

  self.moveGroupInArray = function(idx, moveLeft) {
    printGroupArray("Before move", self.invoiceItemGroups(), idx);

    var maxIdx = self.invoiceItemGroups().length - 1;
    var newLeftItem = undefined;
    var newRightItem = undefined;
    if (moveLeft) {
      newLeftItem = self.invoiceItemGroups()[idx];
      if (idx - 1 >= 0) {
        newRightItem = self.invoiceItemGroups()[idx - 1];
      }
    } else {
      newRightItem = self.invoiceItemGroups()[idx];
      if (idx + 1 <= maxIdx) {
        newLeftItem = self.invoiceItemGroups()[idx + 1];
      }
    }

    // Extract all elements before item
    var before = [];
    var beforeLastItemIdx = moveLeft?idx - 2:idx - 1;
    if (beforeLastItemIdx >= 0) {
      before = self.invoiceItemGroups.slice(0, beforeLastItemIdx + 1);
    }
    printGroupArray("  before", before);

    // Extract all elements after item
    var after = [];
    var afterFirstItemIdx = moveLeft?idx + 1:idx + 2;
    if (afterFirstItemIdx <= maxIdx) {
      after = self.invoiceItemGroups.slice(afterFirstItemIdx);
    }

    printGroupArray("  after", after);

    var newArray = before;
    if (newLeftItem !== undefined) {
      newArray.push(newLeftItem);
    }
    if (newRightItem !== undefined) {
      newArray.push(newRightItem);
    }
    newArray = newArray.concat(after);

    self.invoiceItemGroups(newArray);
    printGroupArray("After move", self.invoiceItemGroups());
  };

  self.moveGroupUp = function(group) {
    var currentIndex = self.invoiceItemGroups.indexOf(group);
    if (currentIndex > 0) {
      Log.info("Move group name=" + group.name() + " up from index=" + currentIndex);
      self.moveGroupInArray(currentIndex, true);
    } else {
      Log.info("Cannot move group name=" + group.name() + " up from index=" + currentIndex);
    }
  };

  self.moveGroupDown = function(group) {
    var currentIndex = self.invoiceItemGroups.indexOf(group);
    if (currentIndex < self.invoiceItemGroups().length - 1) {
      Log.info("Move group name=" + group.name() + " down from index=" + currentIndex);
      self.moveGroupInArray(currentIndex, false);
    } else {
      Log.info("Cannot move group name=" + group.name() + " down from index=" + currentIndex);
    }
  };

  self.toJSON = function() {
    var groups = [];
    for ( var i = 0; i < self.invoiceItemGroups().length; i++) {
      groups.push(self.invoiceItemGroups()[i].toJSON());
    }
    console.log("invoice JSON company=" + JSON.stringify(self.company(), null, 2));
    var res = {
      _id : self._id(),
      docType : self.docType(),
      docNr: self.docNr(),
      uid : self.uid(),
      companyId : self.companyId(),
      company: self.company(),
      isLocked : self.isLocked(),
      isCanceled : self.isCanceled(),
      isPaid : self.isPaid(),
      isCredit : self.isCredit(),
      isValid : self.isValid(),
      customer : self.customer(),
      yourRef : self.yourRef(),
      ourRef : self.ourRef(),
      date : self.date(),
      daysUntilPayment : self.daysUntilPayment(),
      lastPaymentDate : self.lastPaymentDate(),
      projId : self.projId(),
      invoiceItemGroups : groups,
      totalExclVat : self.totalExclVat(),
      totalInclVat : self.totalInclVat()
    };

    return res;
  };
};

var InvoiceListDataViewModel = function(data, filterOpt) {
  var self = this;

  self.filterOpt = filterOpt;

  self._id = ko.observable(data._id);
  self.docType = ko.observable('invoice'); // Invoice is default for old documents
  if (data.hasOwnProperty('docType')) {
    self.docType(data.docType);
  }
  self.docNr = ko.observable(data.docNr);
  if (data.hasOwnProperty('iid') && !data.hasOwnProperty('docNr')) {
    // Support old invoices
    self.docNr(data.iid);
  }
  self.uid = ko.observable(data.uid);
  self.companyId = ko.observable(data.companyId);
  self.isValid = ko.observable(data.isValid);
  self.isCanceled = ko.observable(data.isCanceled);
  self.isPaid = ko.observable(data.isPaid);
  self.isCredit = ko.observable(data.isCredit);
  self.isLocked = ko.observable(data.isLocked);
  self.customer = ko.observable(data.customer);
  self.yourRef = ko.observable(data.yourRef);
  self.ourRef = ko.observable(data.ourRef);
  self.date = ko.observable(data.date);
  self.daysUntilPayment = ko.observable(data.daysUntilPayment);
  self.projId = ko.observable(data.projId);
  self.currency = ko.observable(defaults.defaultCurrency);
  self.hasVat = ko.pureComputed(function() {
    if (self.customer().useReverseCharge ||
        self.customer().noVat) {
      return false;
    } else {
      return true;
    }
  }, self);
  if (data.customer.hasOwnProperty('currency')) {
    self.currency(data.customer.currency);
  }
  self.totalExclVat = ko.observable(data.totalExclVat);
  self.totalInclVat = ko.observable(data.totalInclVat);
  self.totalVat = ko.pureComputed(function() {
    if (self.hasVat()) {
      return self.totalInclVat() - self.totalExclVat();
    } else {
      return 0;
    }
  }, self);
  self.totalExclVatStr = ko.pureComputed(function() {
    return Util.formatCurrency(self.totalExclVat(), {currencyStr: self.currency()});
  }, self);
  self.totalInclVatStr = ko.pureComputed(function() {
    return Util.formatCurrency(self.totalInclVat(), {currencyStr: self.currency()});
  }, self);
  self.totalVatStr = ko.pureComputed(function() {
    return Util.formatCurrency(self.totalVat(), {currencyStr: self.currency()});
  }, self);
  self.isExpired = ko.pureComputed(function() {
    if (self.docType() == 'invoice') {
      var overdue = false;
      if (self.daysUntilPayment() !== undefined && parseInt(self.daysUntilPayment()) >= 0)
      {
        var invoiceDate = new Date(self.date());
        var invoiceAgeMs = Date.now() - invoiceDate.valueOf();
        var invoiceAgeDays = invoiceAgeMs / (1000 * 3600 * 24);
        Log.info("Invoice isExpired: docNr=" + self.docNr() + ", date="
            + invoiceDate + ", ageInDays=" + invoiceAgeDays + ", daysUntilPayment="
            + self.daysUntilPayment());
        if (invoiceAgeDays > parseInt(self.daysUntilPayment())) {
          Log.info("Invoice " + self.docNr() + " is overdue!");
          overdue = true;
        }
      }
      else
      {
        Log.info("Invoice isExpired: docNr=" + self.docNr() + ", not valid daysUntilPayment="
            + self.daysUntilPayment());
      }
      return overdue && !self.isPaid() && !self.isCanceled();
    } else {
      return false;
    }
  }, self);

  self.isVisible = ko.pureComputed(function() {
    var isUnpaid = !this.isPaid();
    var isUnpaidExpired = this.isExpired();
    var paidVisible = !this.isPaid() || (this.filterOpt.showPaid() && this.isPaid());
    var unpaidVisible = !isUnpaid || (this.filterOpt.showUnpaid() && isUnpaid) || (this.filterOpt.showUnpaidExpired() && isUnpaidExpired);
    var unpaidExpiredVisible = !isUnpaidExpired || (this.filterOpt.showUnpaidExpired() && isUnpaidExpired);
    var notCreditVisible = this.isCredit() || (this.filterOpt.showNotCredit() && !this.isCredit());
    var creditVisible = !this.isCredit() || (this.filterOpt.showCredit() && this.isCredit());
    var notCanceledVisible = this.isCanceled() || (this.filterOpt.showNotCanceled() && !this.isCanceled());
    var canceledVisible = !this.isCanceled() || (this.filterOpt.showCanceled() && this.isCanceled());

    var customerMatch = true;
    var custToMatch = this.filterOpt.customerFilterCustomer();
    if (custToMatch !== undefined) {
      if (custToMatch.isWildcard) {
        customerMatch = true;
        Log.info("InvoiceListDataViewModel - customerMatch=" + customerMatch +
          ", cid=" + this.customer().cid + ", matches wildcard");
      } else {
        customerMatch = this.customer().cid == custToMatch.data.cid;
        Log.info("InvoiceListDataViewModel - customerMatch=" + customerMatch +
          ", cid=" + this.customer().cid + ", matchCid=" + custToMatch.data.cid);
      }
    }

    var invoiceDate = new Date(this.date());
    var inDateRange = this.filterOpt.dateFilterIsYearVisible(invoiceDate.getFullYear()) &&
      this.filterOpt.dateFilterIsMonthChecked(invoiceDate.getMonth());

    var currencyMatch = true;
    if (this.filterOpt.currencyFilter() != defaults.currencyWildcard) {
      currencyMatch = this.filterOpt.currencyFilter() == self.currency();
    }

    return self.isValid() && customerMatch && inDateRange && currencyMatch &&
      paidVisible && unpaidVisible && unpaidExpiredVisible &&
      creditVisible && notCreditVisible &&
      canceledVisible && notCanceledVisible;
  }, self);

  self.printDoc = function() {
    Log.info("InvoiceListDataViewModel - Report requested");
    if (self._id() !== undefined) {
      ReportOps.printDoc(self._id(), self.docType());
    } else {
      Notify_showMsg('error', t("app.invoiceList.printNok", {context: "noId"}));
      Log.info("InvoiceListDataViewModel - Invoice has no id.");
    }
  };
};

var InvoiceListViewModel = function(currentView, activeCompanyId) {
  var self = this;

  self.currentView = currentView;
  self.activeCompanyId = activeCompanyId;

  self.isCustomerListExpanded = false;
  self.customerList = ko.observableArray();
  self.invoiceListSort = ko.observable('docNrAsc');

  self.docType = ko.observable();

  inheritCurrencyModel(self, true);

  self.isFilterPaneExpanded = ko.observable(defaults.invoiceListFilter.isPaneExpanded);

  self.numInvoicesText = ko.pureComputed(function() {
    var count = 0;
    for (var i = 0; i < self.docList()().length; i++) {
      var invoice = self.docList()()[i];
      if (invoice.isVisible()) {
        count++;
      }
    }
    return t('app.invoiceList.numDocsLbl', {count: count, context: self.docType()});
  }, self);

  self.invoiceCurrencyList = ko.pureComputed(function() {
    var currencies = ko.utils.arrayMap(self.docList()(), function(item) {
      if (item.isVisible()) {
        return item.currency();
      } else {
        return undefined;
      }
    });

    // Remove any undefined entries
    currencies = ko.utils.arrayFilter(currencies, function(item) {
      return item !== undefined;
    });

    return ko.utils.arrayGetDistinctValues(currencies).sort();
  }, self);

  self.totalPerCurrencyText = ko.pureComputed(function() {
    var sumPerCurrency = ko.utils.arrayMap(self.invoiceCurrencyList(), function(item) {
      return {
        currency: item,
        sumExclVat: 0,
        sumInclVat: 0,
        sumVat: 0,
      };
    });

    for (var i = 0; i < self.docList()().length; i++) {
      var invoice = self.docList()()[i];
      if (invoice.isVisible()) {
        var currency = invoice.currency();
        // Find sum
        var sumItem = ko.utils.arrayFirst(sumPerCurrency, function(item) {
          return item.currency == currency;
        });
        if (sumItem != undefined) {
          sumItem.sumExclVat += invoice.totalExclVat();
          sumItem.sumInclVat += invoice.totalInclVat();
          sumItem.sumVat += invoice.totalVat();
        } else {
          Log.warn("totalPerCurrencyText: Couldn't find currency=" + currency + " for invoice _id=" + invoice._id());
        }
      }
    }

    for (var i = 0; i < sumPerCurrency.length; i++) {
      var item = sumPerCurrency[i];
      item.sumExclVatStr = Util.formatCurrency(item.sumExclVat, {currencyStr: item.currency});
      item.sumInclVatStr = Util.formatCurrency(item.sumInclVat, {currencyStr: item.currency});
      item.sumVatStr = Util.formatCurrency(item.sumVat, {currencyStr: item.currency});
    }
    return sumPerCurrency;
  }, self);

  self.getYear = function(offset) {
    return new Date().getFullYear() + offset;
  }

  self.dateFilterYearList = ko.observableArray(Util.range(self.getYear(-2), self.getYear(0)));

  self.dateFilterAddYears = function(numYearsToAdd) {
    var year = self.getYear(0);
    var addHigh = (numYearsToAdd > 0)?true:false;
    
    for (var i = 0; i < self.dateFilterYearList().length; i++) {
      var y = self.dateFilterYearList()[i];
      if (addHigh) {
        if (y > year) {
          year = y;
        }
      } else {
        if (y < year) {
          year = y;
        }
      }
    }

    var yearToAdd = year;

    for (var i = 0; i < Math.abs(numYearsToAdd); i++) {
      if (addHigh) {
        yearToAdd = yearToAdd + 1;
        self.dateFilterYearList.push(yearToAdd);
      } else {
        yearToAdd = yearToAdd - 1;
        self.dateFilterYearList.unshift(yearToAdd);
      }
    }
  };

  self.filterOpt = {
    showPaid: ko.observable(defaults.invoiceListFilter.showPaid),
    showUnpaid: ko.observable(defaults.invoiceListFilter.showUnpaid),
    showUnpaidExpired: ko.observable(defaults.invoiceListFilter.showUnpaidExpired),
    showNotCredit: ko.observable(defaults.invoiceListFilter.showNotCredit),
    showCredit: ko.observable(defaults.invoiceListFilter.showCredit),
    showNotCanceled: ko.observable(defaults.invoiceListFilter.showNotCanceled),
    showCanceled: ko.observable(defaults.invoiceListFilter.showCanceled),

    customerFilterCustomer: ko.observable(),

    currencyFilter: ko.observable(self.currencyList[0]), // Wildcard selected

    // List containing full year values that will be shown
    dateFilterCheckedYearList: ko.observableArray(['*']),
    // List containing month identifiers (0-11) that will be shown
    dateFilterCheckedMonthList: ko.observableArray(Util.range(0,11)),

    dateFilterIsMonthChecked: function(month) {
      var item = ko.utils.arrayFirst(self.filterOpt.dateFilterCheckedMonthList(), function(item) {
        return item == month;
      });
      return item != undefined;
    },
    dateFilterIsYearChecked: function(fullYear) {
      // List stores full years...
      var item = ko.utils.arrayFirst(self.filterOpt.dateFilterCheckedYearList(), function(item) {
        return item == fullYear;
      });
      return item != undefined;
    },
    dateFilterIsYearVisible: function(fullYear) {
      var isPresent = false;

      // Search for fullYear
      var item = ko.utils.arrayFirst(self.filterOpt.dateFilterCheckedYearList(), function(item) {
        return item == fullYear;
      });
      var isPresent = (item != undefined)?true:false;

      // If not found, check for wildcard
      if (!isPresent) {
        item = ko.utils.arrayFirst(self.filterOpt.dateFilterCheckedYearList(), function(item) {
          return item == '*';
        });
        isPresent = (item != undefined)?true:false;
      }
      return isPresent;
    },
  };

  self.setDateFilterYear = function(yearToAdd) {
    var listItem;
    var isWildcardSelected = false;
    if (typeof yearToAdd === 'string') {
      if (yearToAdd === '*') {
        listItem = '*';
        isWildcardSelected = true;
      }
    } else {
      listItem = yearToAdd;
    }

    // Check if already in checked list
    var isPresent = self.filterOpt.dateFilterIsYearChecked(yearToAdd);
    if (isPresent) {
      self.filterOpt.dateFilterCheckedYearList.remove(listItem);
    } else {
      if (isWildcardSelected) {
        // If wildcard is selected, start with removing previous items
        self.filterOpt.dateFilterCheckedYearList.removeAll();
      } else {
        // If wildcard isn't selected, remove possible wildcard
        self.filterOpt.dateFilterCheckedYearList.remove('*');
      }
      self.filterOpt.dateFilterCheckedYearList.push(listItem);

    }
    console.log("Filter " + (isPresent?"removed":"added") + " year " + listItem +
      ", new list=" + JSON.stringify(self.filterOpt.dateFilterCheckedYearList()));
  };

  self.setDateFilterMonth = function(month) {
    // Check if already in checked list
    var isPresent = self.filterOpt.dateFilterIsMonthChecked(month);
    if (isPresent) {
      self.filterOpt.dateFilterCheckedMonthList.remove(month);
    } else {
      self.filterOpt.dateFilterCheckedMonthList.push(month);
    }
    console.log("Filter " + (isPresent?"removed":"added") + "month " + month +
      ", new list=" + JSON.stringify(self.filterOpt.dateFilterCheckedMonthList()));
  };

  $( "#customerFilterCid" ).on( "autocompleteselect", function( event, ui ) {
    Log.info("Autocomplete customer selected");
    self.isCustomerListExpanded = false;
  } );

  self.currentView.subscribe(function(newValue) {
    // Make sure that the autocomplete box is closed
    // when another view is selected.
    $( "#customerFilterCid" ).autocomplete( "close" );
    self.isCustomerListExpanded = false;

    if (newValue == 'invoices') {
      self.docType('invoice');
      Log.info("InvoiceListViewModel - activated - docType=" + self.docType());
      self.populatePromise();
    } else if (newValue == 'offers') {
      self.docType('offer');
      Log.info("InvoiceListViewModel - activated - docType=" + self.docType());
      self.populatePromise();
    }
  });

  self.activeCompanyId.subscribe(function(newValue) {
    Log.info("InvoiceListViewModel - activeCompanyId.subscribe: value="
        + newValue);
    if (self.currentView() == 'invoices') {
      self.populatePromise(true).done(function() {
        // Make sure that the wildcard customer is selected (first item!)
        self.filterOpt.customerFilterCustomer(self.customerList()[0]);
      });
    } else {
      Cache.invalidateInvoices();
    }
  });

  // Invoice part
  self.invoiceList = ko.observableArray();
  self.offerList = ko.observableArray();
  self.docList = ko.pureComputed(function () {
    if (self.docType() == 'offer') {
      return self.offerList;
    } else {
      return self.invoiceList;
    }
  }, self);

  self.sortMappedCustomersByName = function(a, b) {
    var aStr = a.getName().toLowerCase();
    var bStr = b.getName().toLowerCase();
    if (aStr < bStr) {
      return -1;
    } else if (aStr > bStr) {
      return 1;
    } else {
      return 0;
    }
  };

  cache.on('set:' + Cache.INVOICES(), function(invoices, ttl) {
    Log.info("InvoiceListViewModel - event - set:" + Cache.INVOICES());
    var mappedInvoices = $.map(invoices, function(item) {
      return new InvoiceListDataViewModel(item, self.filterOpt);
    });
    self.invoiceList(mappedInvoices);
  });

  cache.on('update:' + Cache.INVOICES(), function(invoices, ttl) {
    Log.info("InvoiceListViewModel - event - update:" + Cache.INVOICES());
    var mappedInvoices = $.map(invoices, function(item) {
      return new InvoiceListDataViewModel(item, self.filterOpt);
    });
    self.invoiceList(mappedInvoices);
  });

  cache.on('del:' + Cache.INVOICES(), function() {
    Log.info("InvoiceListViewModel - event - del:" + Cache.INVOICES());
    self.invoiceList.removeAll();
  });

  cache.on('set:' + Cache.OFFERS(), function(invoices, ttl) {
    Log.info("InvoiceListViewModel - event - set:" + Cache.OFFERS());
    var mappedInvoices = $.map(invoices, function(item) {
      return new InvoiceListDataViewModel(item, self.filterOpt);
    });
    self.offerList(mappedInvoices);
  });

  cache.on('update:' + Cache.OFFERS(), function(invoices, ttl) {
    Log.info("InvoiceListViewModel - event - update:" + Cache.OFFERS());
    var mappedInvoices = $.map(invoices, function(item) {
      return new InvoiceListDataViewModel(item, self.filterOpt);
    });
    self.offerList(mappedInvoices);
  });

  cache.on('del:' + Cache.INVOICES(), function() {
    Log.info("InvoiceListViewModel - event - del:" + Cache.OFFERS());
    self.offerList.removeAll();
  });

  cache.on('set:' + Cache.CUSTOMERS(), function(customers, ttl) {
    Log.info("InvoiceListViewModel - event - set:" + Cache.CUSTOMERS());
    var mappedCustomers = $.map(customers, function(item) {
      return new InvoiceListCustomerModel(item);
    });
    mappedCustomers.sort(self.sortMappedCustomersByName);
    // Add wildcard
    mappedCustomers.unshift(new InvoiceListCustomerModel(null, true));
    self.customerList(mappedCustomers);
  });

  cache.on('update:' + Cache.CUSTOMERS(), function(customers, ttl) {
    Log.info("InvoiceListViewModel - event - update:" + Cache.CUSTOMERS());
    var mappedCustomers = $.map(customers, function(item) {
      return new InvoiceListCustomerModel(item);
    });
    mappedCustomers.sort(self.sortMappedCustomersByName);
    // Add wildcard
    mappedCustomers.unshift(new InvoiceListCustomerModel(null, true));
    self.customerList(mappedCustomers);
  });

  cache.on('del:' + Cache.CUSTOMERS(), function() {
    Log.info("InvoiceListViewModel - event - del:" + Cache.CUSTOMERS());
    self.customerList.removeAll();
  });

  self.populatePromise = function(force) {
    var deferred = $.Deferred();
    force = typeof force !== 'undefined' ? force : false;
    var companyId = self.activeCompanyId();
    if (companyId != null) {
      var docsJob = undefined;
      var customersJob = undefined;

      if (self.docType() == 'invoice') {
        // Do nothing if object exists in cache
        if (force || !cache.get(Cache.INVOICES())) {
          docsJob = Cache.fetchInvoicesPromise(companyId);
        }
      } else {
        // Do nothing if object exists in cache
        if (force || !cache.get(Cache.OFFERS())) {
          docsJob = Cache.fetchOffersPromise(companyId);
        }
      }

      if (docsJob === undefined) {
        Log.info("InvoiceListViewModel - populate - data is cached! docType=" + self.docType());
        docsJob = $.Deferred();
        docsJob.resolve();
      }

      // Do nothing if object exists in cache
      if (force || !cache.get(Cache.CUSTOMERS())) {
        customersJob = Cache.fetchCustomersPromise(companyId);
      } else {
        Log.info("InvoiceListViewModel - populate - customer data is cached!");
        customersJob = $.Deferred();
        customersJob.resolve();
      }

      Notify_showSpinner(true);
      $.when(docsJob, customersJob).then(function(docsRes, customersRes) {
        Notify_showSpinner(false);
        deferred.resolve();
      }).fail(function() {
        Log.info("InvoiceListViewModel - populate - failed");
        Notify_showSpinner(false);
        Notify_showMsg('error', t("app.invoiceList.getNok"));
        deferred.reject();
      });
    } else {
      Notify_showMsg('info', t("app.invoiceList.getNok", {context: "noCompany"}));
      browserNavigateBack();
      deferred.reject();
    }
    return deferred.promise();
  };

  self.doShowCustomerList = function() {
    Log.info("InvoiceListViewModel - Show customer list requested, isExpanded=" + self.isCustomerListExpanded);
    if (self.isCustomerListExpanded) {
      // Close if already expanded
      $( "#customerFilterCid" ).autocomplete( "close" );
    } else {
      // Open search
      $( "#customerFilterCid" ).autocomplete( "search", "" );
    }
    self.isCustomerListExpanded = !self.isCustomerListExpanded;
  };

  self.doToggleFilterPaneExpanded = function() {
    self.isFilterPaneExpanded(!self.isFilterPaneExpanded());
    Log.info("InvoiceListViewModel - isFilterPaneExpanded=" + self.isFilterPaneExpanded()
        + " (new state)");
  };
  
  self.doSortToggle = function(field) {
    if (self.invoiceListSort() === field + 'Asc') {
      self.invoiceListSort(field + 'Desc');
    } else {
      self.invoiceListSort(field + 'Asc');
    }
  };

  self.invoiceListSort.subscribe(function(newVal) {
    Log.info("InvoiceListViewModel - invoiceListSort.subscribe=" + JSON.stringify(newVal));
    // Sort according to compare method.
    self.docList().sort(self[newVal + 'Compare']);
  });
  
  self.docNrAscCompare = function(aRow, bRow) {
    return aRow.docNr() - bRow.docNr();
  };

  self.docNrDescCompare = function(aRow, bRow) {
    return self.docNrAscCompare(bRow, aRow);
  };

  self.dateAscCompare = function(aRow, bRow) {
    var aDate = new Date(aRow.date());
    var bDate = new Date(bRow.date());
    return aDate.valueOf() - bDate.valueOf();
  };

  self.dateDescCompare = function(aRow, bRow) {
    return self.dateAscCompare(bRow, aRow);
  };

  self.cidAscCompare = function(aRow, bRow) {
    return aRow.customer().cid - bRow.customer().cid;
  };

  self.cidDescCompare = function(aRow, bRow) {
    return self.cidAscCompare(bRow, aRow);
  };

  self.customerAscCompare = function(aRow, bRow) {
    if (aRow.customer().name < bRow.customer().name) {
      return -1;
    } else if (aRow.customer().name > bRow.customer().name) {
      return 1;
    } else {
      return 0;
    }
  };

  self.customerDescCompare = function(aRow, bRow) {
    return self.customerAscCompare(bRow, aRow);
  };

  self.currencyAscCompare = function(aRow, bRow) {
    if (aRow.currency() < bRow.currency()) {
      return -1;
    } else if (aRow.currency() > bRow.currency()) {
      return 1;
    } else {
      return 0;
    }
  };

  self.currencyDescCompare = function(aRow, bRow) {
    return self.currencyAscCompare(bRow, aRow);
  };

  self.totalExclVatAscCompare = function(aRow, bRow) {
    return aRow.totalExclVat() - bRow.totalExclVat();
  };

  self.totalExclVatDescCompare = function(aRow, bRow) {
    return self.totalExclVatAscCompare(bRow, aRow);
  };

  self.totalVatAscCompare = function(aRow, bRow) {
    return aRow.totalVat() - bRow.totalVat();
  };

  self.totalVatDescCompare = function(aRow, bRow) {
    return self.totalVatAscCompare(bRow, aRow);
  };
};

var InvoiceCustomerModel = function(data) {
  var self = this;
  self.data = data;
  // Save string in object since autocomplete searches all attributes
  self.description = "" + self.data.name + " ("+ self.data.cid + ")";
  self.getName = function() {
    return self.data.name;
  }
  self.toString = function() {
    return self.description;
  };
};

var InvoiceListCustomerModel = function(data, isWildcard) {
  var self = this;
  isWildcard = typeof isWildcard !== 'undefined' ? isWildcard : false;
  self.data = data;
  self.isWildcard = isWildcard;
  if (self.isWildcard) {
    self.description =  t("app.invoiceList.customerFilterWildcardText");
  } else {
    self.description = "" + self.data.name + " ("+ self.data.cid + ")";
  }
  self.getName = function() {
    return self.data.name;
  };
  self.toString = function() {
    return self.description;
  };
};

var InvoiceNewViewModel = function(currentView, activeCompany) {
  var self = this;

  self.data = new InvoiceDataViewModel();

  self.currentView = currentView;
  self.activeCompany = activeCompany;
  self.customerList = ko.observableArray();
  self.selectedCustomer = ko.observable();
  self.selectedCustomerUpdatesData = true;
  self.isCustomerListExpanded = false;
  self.isInvoice = ko.pureComputed(function() {
    return self.data.docType() == 'invoice';
  }, self);
  self.isOffer = ko.pureComputed(function() {
    return self.data.docType() == 'offer';
  }, self);

  self.itemGroupList = ko.observableArray();

  inheritInvoiceStyleModel(self);
  inheritInvoiceLngModel(self);
  inheritCurrencyModel(self);
  
  $( "#invoiceNewCustomerId" ).on( "autocompleteselect", function( event, ui ) {
    Log.info("Autocomplete customer selected");
    self.isCustomerListExpanded = false;
  } );

  self.newGroup = function(g) {
    var group = ko.toJS(g)
    Log.info("New group name=" + group.name + ", id=" + group._id);
    self.data.addGroup(group);
  };
  
  self.currentView.subscribe(function(newValue) {
    // Make sure that the autocomplete box is closed
    // when another view is selected.
    $( "#invoiceNewCustomerId" ).autocomplete( "close" );
    self.isCustomerListExpanded = false;

    self.data.init();
    self.selectedCustomer(undefined);

    var viewArray = newValue.split("/");
    var docTypeOpArray = viewArray[0].split('_');
    var docType = docTypeOpArray[0];
    var docOp = (docTypeOpArray.length > 1)?docTypeOpArray[1]:"";
    if (docType == 'invoice' || docType == 'offer') {
      if (docOp == 'new') {
        Log.info("InvoiceNewViewModel - activated, docType=" + docType);
        self.selectedCustomerUpdatesData = true;
        if (self.activeCompany() !== undefined) {
          self.data.init(docType, self.activeCompany().defaultNumDaysUntilPayment());
          self.data.setCompany(self.activeCompany().toJSON());
          self.data.setCompanyId(self.activeCompany()._id());
          self.populatePromise().done(self.syncCustomerIdInput);
        } else {
          Notify_showMsg('info', t("app.invoice.newNok", {context: "noCompany"}));
          browserNavigateBack();
        }
      } else if (docOp == 'show' && viewArray.length > 1) {
        var _id = viewArray[1];
        Log.info("InvoiceNewViewModel - activated, docType=" + docType + " - show #" + _id);
        // Disable that the customer select via the subscription updates
        // the customer fields stored in the invoice.
        self.selectedCustomerUpdatesData = false;
        var getDocJob = self.getDocPromise(_id, docType);
        var populateJob = self.populatePromise();
        $.when(getDocJob, populateJob).then(function(getInvoiceRes, populateRes) {
          self.syncCustomerIdInput();
          self.selectedCustomerUpdatesData = true;
        });
      }
    }
  });

  self.sortMappedCustomersByName = function(a, b) {
    var aStr = a.getName().toLowerCase();
    var bStr = b.getName().toLowerCase();
    if (aStr < bStr) {
      return -1;
    } else if (aStr > bStr) {
      return 1;
    } else {
      return 0;
    }
  };

  self.selectedCustomer.subscribe(function(newValue) {
    if (newValue !== undefined && newValue.data !== undefined) {
      Log.info("InvoiceNewViewModel - Customer selected (updates data " + self.selectedCustomerUpdatesData + 
        ") - " + JSON.stringify(newValue.data));
      if (self.selectedCustomerUpdatesData) {
        self.data.setCustomer(newValue.data);
      }
    }
  });

  cache.on('set:' + Cache.CUSTOMERS(), function(customers, ttl) {
    Log.info("InvoiceNewViewModel - event - set:" + Cache.CUSTOMERS());
    var mappedCustomers = $.map(customers, function(item) {
      return new InvoiceCustomerModel(item);
    });
    mappedCustomers.sort(self.sortMappedCustomersByName);
    self.customerList(mappedCustomers);
  });

  cache.on('update:' + Cache.CUSTOMERS(), function(customers, ttl) {
    Log.info("InvoiceNewViewModel - event - update:" + Cache.CUSTOMERS());
    var mappedCustomers = $.map(customers, function(item) {
      return new InvoiceCustomerModel(item);
    });
    mappedCustomers.sort(self.sortMappedCustomersByName);
    self.customerList(mappedCustomers);
  });

  cache.on('del:' + Cache.CUSTOMERS(), function() {
    Log.info("InvoiceNewViewModel - event - del:" + Cache.CUSTOMERS());
    self.customerList.removeAll();
  });

  cache.on('set:' + Cache.ITEM_GROUP_TEMPLATES(), function(groupTemplates, ttl) {
    Log.info("InvoiceNewViewModel - event - set:" + Cache.ITEM_GROUP_TEMPLATES());
    var mappedGroupTemplates = $.map(groupTemplates, function(item) {
      var group = new InvoiceItemGroupViewModel(false, self.data.currency, self.data.isLocked);
      group.setData(item);
      return group;
    });
    self.itemGroupList(mappedGroupTemplates);
  });

  cache.on('update:' + Cache.ITEM_GROUP_TEMPLATES(), function(groupTemplates, ttl) {
    Log.info("InvoiceNewViewModel - event - update:" + Cache.ITEM_GROUP_TEMPLATES());
    var mappedGroupTemplates = $.map(groupTemplates, function(item) {
      var group = new InvoiceItemGroupViewModel(false, self.data.currency, self.data.isLocked);
      group.setData(item);
      return group;
    });
    self.itemGroupList(mappedGroupTemplates);
  });

  cache.on('del:' + Cache.ITEM_GROUP_TEMPLATES(), function() {
    Log.info("InvoiceNewViewModel - event - del:" + Cache.ITEM_GROUP_TEMPLATES());
    self.itemGroupList.removeAll();
  });

  self.populatePromise = function(force) {
    var deferred = $.Deferred();
    force = typeof force !== 'undefined' ? force : false;
    var companyId = self.activeCompany()._id();
    if (companyId != null) {
      var customersJob = undefined;
      var groupTemplatesJob = undefined;
      // Do nothing if object exists in cache
      if (force || !cache.get(Cache.CUSTOMERS())) {
        customersJob = Cache.fetchCustomersPromise(companyId);
      } else {
        Log.info("InvoiceNewViewModel - populate - customer data is cached!");
        customersJob = $.Deferred();
        customersJob.resolve();
      }

      if (force || !cache.get(Cache.ITEM_GROUP_TEMPLATES())) {
        groupTemplatesJob = Cache.fetchItemGroupTemplatesPromise();
      } else {
        Log.info("InvoiceNewViewModel - populate - groupTemplate data is cached!");
        groupTemplatesJob = $.Deferred();
        groupTemplatesJob.resolve();
      }

      Notify_showSpinner(true);
      $.when(customersJob, groupTemplatesJob).then(function(customersRes, groupTemplatesRes) {
        Notify_showSpinner(false);
        deferred.resolve();
      }).fail(function() {
         Log.info("InvoiceNewViewModel - populate - failed");
         Notify_showSpinner(false);
         Notify_showMsg('error', t("app.invoice.getGroupTemplatesNok"));
         Notify_showMsg('error', t("app.invoice.getCustomersNok"));
         deferred.reject();
      });
    } else {
      Notify_showMsg('info', t("app.invoice.getCustomersNok", {context: "noCompany"}));
      browserNavigateBack();
      deferred.reject();
    }
    return deferred.promise();
  };

  self.getDocPromise = function(_id, docType) {
    var deferred = $.Deferred();

    var doOnDoc = function(doc) {
      // Support old documents without docType
      if (!doc.hasOwnProperty('docType')) {
        Log.info("Detected old doc without docType. Set explicitly to type=" + docType + ", id=" + doc._id);
        doc.docType = docType;
      }
      // Support old invoices without groups
      if (!doc.invoiceItemGroups && doc.invoiceItems) {
        var groupToUse = {
          _id: undefined,
          name: "Detaljer konverterad",
          title: "Detaljer",
          isValid: true,
          isQuickButton: false,
          isTextOnlyDefault: false,
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
        Log.info("Detected old doc type=" + doc.docType + ", id=" + doc._id +
          " format without item groups. Converting doc using group name=" + groupToUse.name);
        var newGroup = JSON.parse(JSON.stringify(groupToUse));
        newGroup.invoiceItems = doc.invoiceItems;
        doc.invoiceItemGroups = [newGroup];

      }
      self.data.setData(doc);
    };

    var getJob;
    if (docType == 'invoice') {
      getJob = Cache.getInvoicePromise(_id);
    } else {
      getJob = Cache.getOfferPromise(_id);
    }

    getJob.done(function(doc) {
      Log.info("Doc type=" + docType + ", in cache id=" + _id);
      // Found in cache
      doOnDoc(doc);
      deferred.resolve(doc);
    }).fail(function() {
      Log.info("Doc type=" + docType + ", not in cache id=" + _id);
      var fetchJob;
      if (docType == 'invoice') {
        fetchJob = Cache.fetchInvoicePromise(_id);
      } else {
        fetchJob = Cache.fetchOfferPromise(_id);
      }
      fetchJob.done(function(doc) {
        Log.info("Got doc type=" + docType + ", id=" + _id + ", data=" + JSON.stringify(doc));
        Notify_showSpinner(false);
        doOnDoc(doc);
        deferred.resolve(doc);
      }).fail(function(err) {
        Log.info("InvoiceNewViewModel - getInvoice - failed, type=" + self.docType());
        Notify_showSpinner(false);
        Notify_showMsg('error', t("app.invoice.getNok"));
        deferred.reject(err);
      });
    });
    return deferred.promise();
  };

  self.syncCustomerIdInput = function() {
    Log.info("InvoiceNewViewModel - syncCustomerIdInput");
    if (self.data.customer() !== undefined) {
      var cid = self.data.customer().cid;
      for (var i = 0; i < self.customerList().length; i++) {
        if (cid === self.customerList()[i].data.cid) {
          Log.info("InvoiceNewViewModel - syncCustomerIdInput: cid=" + cid + " found");
          self.selectedCustomer(self.customerList()[i]);
          break;
        }
      }
    } else {
      Log.info("InvoiceNewViewModel - syncCustomerIdInput: customer is undefined");        
    }
  };

  self.doSaveDoc = function() {
    if ((self.data._id() === undefined) && !self.data.isValid()) {
      Notify_showMsg('error', t("app.invoice.saveNok"));
      Log.info("doSaveDoc: Nothing to do (invalid entry without _id)");
      return;
    } else if (self.data.customer() === undefined) {
      Notify_showMsg('error', t("app.invoice.saveNok", {context: 'invalidCustomer'}));
      Log.info("No customer selected: " + JSON.stringify(self.data.customer()));
      return;
    } else if (self.data.date() === undefined) {
      Notify_showMsg('error', t("app.invoice.saveNok", {context: 'invalidDate'}));
      return;
    }
    var isNewDoc = (self.data._id() == undefined) ? true : false;
    var ajaxData = JSON.stringify(self.data.toJSON());
    var ajaxUrl = "/api/" + self.data.docType() + "/" + self.data._id();
    Log.info("doSaveDoc: AJAX PUT (url=" + ajaxUrl + "): JSON="
        + ajaxData);
    Notify_showSpinner(true, t("app.invoice.saveTicker"));
    return $.ajax({
      url : ajaxUrl,
      type : "PUT",
      contentType : "application/json",
      data : ajaxData,
      dataType : "json",
      success : function(data) {
        Log.info("doSaveDoc: response: " + JSON.stringify(data));
        var tContext = "";
        if (!isNewDoc) {
          tContext = (data.doc.isValid) ? 'update' : 'delete';
        }
        Notify_showSpinner(false);
        Notify_showMsg('success',
            t("app.invoice.saveOk",
                   {context: tContext, docNr: data.doc.docNr}));
        // Set params set from server
        self.data._id(data.doc._id);
        self.data.docNr(data.doc.docNr);
        self.data.uid(data.doc.uid);
        self.data.companyId(data.doc.companyId);
        self.data.company(data.doc.company);
        self.data.isValid(data.doc.isValid);
        if (isNewDoc) {
          cache.del(Cache.CURR_USER_STATS());
          if (self.isInvoice()) {
            Cache.addInvoice(data.doc);
          } else {
            Cache.addOffer(data.doc);
          }
        } else {
          if (self.isInvoice()) {
            Cache.updateInvoice(data.doc);
          } else {
            Cache.updateOffer(data.doc);
          }
        };
      },
    });
  };

  self.doShowCustomerList = function() {
    Log.info("InvoiceNewViewModel - Show customer list requested, isExpanded=" + self.isCustomerListExpanded);
    if (self.isCustomerListExpanded) {
      // Close if already expanded
      $( "#invoiceNewCustomerId" ).autocomplete( "close" );
    } else {
      // Open search
      $( "#invoiceNewCustomerId" ).autocomplete( "search", "" );
    }
    self.isCustomerListExpanded = !self.isCustomerListExpanded;

  };
  
  self.doDocPrint = function() {
    Log.info("InvoiceNewViewModel - Print requested");
    if (self.data._id() !== undefined) {
      ReportOps.printDoc(self.data._id(), self.data.docType());
    } else {
      Notify_showMsg('info', t("app.invoice.printNok", {context: 'noId'}));
      Log.info("InvoiceNewViewModel - Invoice not saved.");
    }
  };
  
  self.doInvoiceReminderPrint = function() {
    Log.info("InvoiceNewViewModel - Print reminder requested");
    if (self.data._id() !== undefined) {
      ReportOps.printInvoice(self.data._id(), {isReminder: true});
    } else {
      Notify_showMsg('info', t("app.invoice.printNok", {context: 'noId'}));
      Log.info("InvoiceNewViewModel - Invoice not saved.");
    }
  };

  self.doCopyDoc = function() {
    Log.info("InvoiceNewViewModel - Copy invoice requested");
    /* Mark datafields so that the next save will allocate new invoice ids */
    self.data.forceMarkAsNew();
  };

  self.doToggleLocked = function(item) {
    self.data.doToggleLocked();
  };
  self.doTogglePaid = function(item) {
    self.data.doTogglePaid();
  };

  self.refreshCompanyData = function() {
    self.data.setCompany(self.activeCompany().toJSON());
  };
};

var DebugViewModel = function(currentView) {
  var self = this;
  self.currentView = currentView;
  self.spinnerVisible = ko.observable(false);
  self.infoVisible = ko.observable(false);

  self.currentView.subscribe(function(newValue) {
    if (newValue == 'debug') {
      Log.info("DebugViewModel - activated");
    }
  });

  self.spinnerVisible.subscribe(function(showSpinner) {
    Log.info("DebugViewModel - showSpinner: " + showSpinner);
    Notify_showSpinner(showSpinner);
  });

  self.showInfoMsg = function() {
    Notify_showMsg('info', "This is an <strong>info</strong> message!");
  };

  self.showSuccessMsg = function() {
    Notify_showMsg('success', "This is a <strong>success</strong> message!");
  };

  self.showWarningMsg = function() {
    Notify_showMsg('warning', "This is a <strong>warning</strong> message!");
  };

  self.showErrorMsg = function() {
    Notify_showMsg('error', "This is an <strong>error</strong> message!");
  };

  self.downloadLog = function() {
    Log.info("downloadLog");
    Notify_showSpinner(true);
    try {
      var child = window.open("/api/log");
      $(child).ready(function() {
        Log.info("downloadLog - done!");
        Notify_showSpinner(false);
      });
      child.focus();
    } catch (e) {
      Log.info("downloadLog - Failed!");
      Notify_showSpinner(false);
    }
  };
};

var UserViewModel = function() {
  var self = this;
  var USER_STATS_KEY = function() {
    return Cache.USER_STATS(self._id());
  };

  self._id = ko.observable();
  self.googleId = ko.observable();
  self.type = ko.pureComputed(function() {
    var typeStr = "";
    if (self.googleId() !== undefined &&
        self.googleId() !== null && 
        self.googleId() !== "")
    {
      typeStr = "Google";
    } else {
      typeStr = "Local";
    }
    return typeStr;
  }, self);
  self.info = {
      "name": ko.observable(),
      "email": ko.observable(),
      "registrationDate": ko.observable(),
      "isAdmin": ko.observable(),
      "lastAccessDate": ko.observable(),
      "accessCount": ko.observable(),
  };
  self.settings = ko.observable();
  self.isDetailsVisible = ko.observable(false);
  self.totalStats = ko.observable();

  self.lastAccessDateStr = ko.pureComputed(function() {
    var dateStr = "";
    if (this.info.lastAccessDate() !== undefined)
    {
      var lastAccessDate = this.info.lastAccessDate();
      var dateTimePart = lastAccessDate.split("T");
      var datePart = dateTimePart[0];
      var timePart = dateTimePart[1].split('.')[0];
      dateStr = datePart + " " + timePart;
    } else {
      dateStr = "-";
    }
    return dateStr;
  }, self);
  
  self.isSelf = ko.pureComputed(function() {
    return this._id() === cfg.user._id;
  }, self);

  self.setData = function(data) {
    self._id(data._id);
    self.googleId(data.googleId);
    self.info.name(data.info.name);
    self.info.email(data.info.email);
    self.info.registrationDate(data.info.registrationDate);
    self.info.isAdmin(data.info.isAdmin);
    self.info.lastAccessDate(data.lastAccessDate);
    self.info.accessCount(data.accessCount);
    self.settings(data.settings);
    self.isDetailsVisible(false);
    self.totalStats({
      "numCompanies": 0,
      "numCustomers": 0,
      "numInvoices": 0,
      "numItemGroupTemplates": 0
    });

    cache.on('set:' + USER_STATS_KEY(), function(stats, ttl) {
      Log.info("UserViewModel - event - set:" + USER_STATS_KEY());
      self.totalStats(stats.total);
      self.isDetailsVisible(true);
    });

    cache.on('del:' + USER_STATS_KEY(), function() {
      Log.info("UserViewModel - event - del:" + USER_STATS_KEY());
    });
  };
  
  self.populate = function() {
    // Do nothing if object exists in cache
    if (!cache.get(USER_STATS_KEY())) {
      Notify_showSpinner(true);
      $.getJSON(
          "/api/userStats/" + self._id(),
          function(stats) {
            Log.info("Got stats for uid=" + self._id() + ", stats=" + JSON.stringify(stats));
            cache.set(USER_STATS_KEY(), stats);
            Notify_showSpinner(false);
          }).fail(function() {
            Log.info("UserViewModel - toggleDetailedInfo - failed");
            Notify_showSpinner(false);
            Notify_showMsg('error', t("app.userList.getNok"));
          });      
    } else {
      Log.info("UserViewModel - populate - data is cached!");
      self.isDetailsVisible(true);
    }
  };
  
  self.toggleDetailedInfo = function(user) {
    var newIsDetailsVisible = !self.isDetailsVisible();
    Log.info("UserViewModel - toggleDetailedInfo: visible=" + newIsDetailsVisible + " (new value)");
    
    if (newIsDetailsVisible) {
      self.populate();
    } else {
      self.isDetailsVisible(false);
    }    
  };
  
  self.invalidateCache = function() {
    // Hide before cache deletion
    self.isDetailsVisible(false);
    cache.del(USER_STATS_KEY());
  };
};

var UserListViewModel = function(currentView) {
  var self = this;

  self.currentView = currentView;

  self.currentView.subscribe(function(newValue) {
    if (newValue == 'users') {
      Log.info("UserListViewModel - activated");
      self.populate();
    }
  });

  self.userList = ko.observableArray();

  cache.on('set:' + Cache.USERS(), function(users, ttl) {
    Log.info("UserListViewModel - event - set:" + Cache.USERS());
    var mappedUsers = $.map(users, function(item) {
      var user = new UserViewModel();
      user.setData(item);
      return user;
    });
    self.userList(mappedUsers);
  });

  cache.on('del:' + Cache.USERS(), function() {
    Log.info("UserListViewModel - event - del:" + Cache.USERS());
    self.populate();
  });

  self.populate = function() {
    // Do nothing if object exists in cache
    if (!cache.get(Cache.USERS())) {
      Notify_showSpinner(true);
      $.getJSON("/api/users", function(allData) {
        Log.info("Got users: " + JSON.stringify(allData));
        cache.set(Cache.USERS(), allData);
        Notify_showSpinner(false);
      }).fail(function() {
        Log.info("UserListViewModel - populate - failed");
        Notify_showSpinner(false);
        Notify_showMsg('error', t("app.userList.getNok"));
      });
    } else {
      Log.info("UserListViewModel - populate - data is cached!");
    }
  };

  self.refresh = function() {
    Log.info("UserListViewModel - refresh");
    self.userList().forEach(function(user) {
      user.invalidateCache();
    });
    cache.del(Cache.USERS());
  };
};

var InviteViewModel = function() {
  var self = this;

  self.email = ko.observable();
  self.license = ko.observable();
  self.isAdmin = ko.observable();
  
  self.setData = function(data) {
    self.email(data.email);
    self.license(data.license);
    self.isAdmin(data.isAdmin);
  };  
};

var InviteListViewModel = function(currentView) {
  var self = this;

  self.currentView = currentView;

  self.currentView.subscribe(function(newValue) {
    if (newValue == 'invites') {
      Log.info("InviteListViewModel - activated");
      self.populate();
    }
  });

  self.inviteList = ko.observableArray();

  cache.on('set:' + Cache.INVITES(), function(invites, ttl) {
    Log.info("InviteViewModel - event - set:" + Cache.INVITES());
    var mappedInvites = $.map(invites, function(item) {
      var invite = new InviteViewModel();
      invite.setData(item);
      return invite;
    });
    self.inviteList(mappedInvites);
  });

  cache.on('del:' + Cache.INVITES(), function() {
    Log.info("InviteViewModel - event - del:" + Cache.INVITES());
    self.populate();
  });

  self.populate = function() {
    // Do nothing if object exists in cache
    if (!cache.get(Cache.INVITES())) {
      Notify_showSpinner(true);
      $.getJSON("/api/invites", function(allData) {
        Log.info("Got invites: " + JSON.stringify(allData));
        cache.set(Cache.INVITES(), allData);
        Notify_showSpinner(false);
      }).fail(function() {
        Log.info("InviteListViewModel - populate - failed");
        Notify_showSpinner(false);
        Notify_showMsg('error', t("app.inviteList.getNok"));
      });
    } else {
      Log.info("InviteListViewModel - populate - data is cached!");
    }
  };
  
  self.refresh = function() {
    Log.info("InviteListViewModel - refresh");
    cache.del(Cache.INVITES());
  };
};

var NavViewModel = function() {
  var self = this;
  
  self.mainViews = [];
  self.mainViews.push({
    name : '/page/home',
    title : t("app.navBar.home"),
    icon : 'glyphicon glyphicon-home',
    location : 'main'
  });
  self.mainViews.push({
    name : '/page/companies',
    title : t("app.navBar.companyAdmin"),
    icon : 'glyphicon glyphicon-wrench',
    location : 'companyMenu'
  });
  self.mainViews.push({
    name : '/page/customer_new',
    title : t("app.navBar.customerNew"),
    icon : 'glyphicon glyphicon-user',
    location : 'main'
  });
  self.mainViews.push({
    name : '/page/customers',
    title : t("app.navBar.customerList"),
    icon : 'glyphicon glyphicon-user',
    location : 'main'
  });
  self.mainViews.push({
    name : '/page/invoice_new',
    title : t("app.navBar.invoiceNew"),
    icon : 'glyphicon glyphicon-file',
    location : 'main'
  });
  self.mainViews.push({
    name : '/page/invoices',
    title : t("app.navBar.invoiceList"),
    icon : 'glyphicon glyphicon-th-list',
    location : 'main'
  });
  self.mainViews.push({
    name : '/page/offer_new',
    title : t("app.navBar.offerNew"),
    icon : 'glyphicon glyphicon-file',
    location : 'userMenu'
  });
  self.mainViews.push({
    name : '/page/offers',
    title : t("app.navBar.offerList"),
    icon : 'glyphicon glyphicon-th-list',
    location : 'userMenu'
  });
  self.mainViews.push({
    name : '/page/invoice_item_group_templates',
    title : t("app.navBar.invoiceItemGroupTemplates"),
    icon : 'glyphicon glyphicon-list-alt',
    location : 'userMenu'
  });
  self.mainViews.push({
    name : '/page/settings',
    title : t("app.navBar.settings"),
    icon : 'glyphicon glyphicon-wrench',
    location : 'userMenu'
  });
  if (cfg.user.isAdmin) {
    self.mainViews.push({
      name : '/page/debug',
      title : t("app.navBar.debug"),
      icon : 'glyphicon glyphicon-eye-open',
      location : 'userMenu'
    });
    self.mainViews.push({
      name : '/page/users',
      title : t("app.navBar.users"),
      icon : 'glyphicon glyphicon-user',
      location : 'userMenu'
    });
    self.mainViews.push({
      name : '/page/invites',
      title : t("app.navBar.invites"),
      icon : 'glyphicon glyphicon-gift',
      location : 'userMenu'
    });
  }
  self.mainViews.push({
    name : '/logout',
    title : t("app.navBar.logout"),
    icon : 'glyphicon glyphicon-log-out',
    location : 'userMenuNoRoute'
  });

  self.currentView = ko.observable("");
  self.activeCompanyId = ko.observable();
  self.activeCompany = ko.observable();
  self.activeCompanyName = ko.observable(t('app.navBar.noCompanyName'));
  self.userName = ko.observable(cfg.user.name);
  self.companyList = ko.observableArray();

  self.selectView = function(view) {
    location.hash = view.name;
  };
  
  self.activeCompany.subscribe(function(c) {
    if (c != undefined) {
      Log.info("Active company change detected: new=" + JSON.stringify(c) + ", c.name type is " + typeof c.name);
      // Fix for problem when c.name is not a function in case activeCompany()
      // is set when updating currently active company
      if (typeof c.name === "function") {
        self.activeCompanyName(c.name());
      } else {
        self.activeCompanyName(c.name);
      }
    }
  });
  
  self.selectCompany = function(company) {
    Log.info("navigation - selectCompany: " + JSON.stringify(company));
    self.activeCompanyId(company._id());
    
    // Work-around: Navigate to home instead of making sure that all views updates when company is changed
    location.hash = '/page/home';
  };

  self.routes = {
    '/page/:view' : function(view) {
      self.currentView(view);
      Log.info("navigation - view: " + view);
    },
    '/page/:view/:param' : function(view, param) {
      self.currentView(view + "/" + param);
      Log.info("navigation - view: " + view + ", param=" + param);
    }
  };
  self.router = Router(self.routes);
  self.router.init(self.mainViews[0].name);
};

var GettingStartedViewModel = function(currentView, activeCompanyId) {
  var self = this;
  self.currentView = currentView;
  self.activeCompanyId = activeCompanyId;
  self.stats = ko.observable();
  self.enabled = ko.observable(false);

  self.numCompanies = ko.pureComputed(function() {
    if ((self.activeCompanyId() === undefined) || (self.activeCompanyId() === null) ||
        (self.stats() === undefined)) {
      return 0;
    } else {
      return self.stats().total.numCompanies;
    }
  }, self);

  self.numCustomers = ko.pureComputed(function() {
    if ((self.activeCompanyId() === undefined) || (self.activeCompanyId() === null) ||
        (self.stats() === undefined)) {
      return 0;
    } else {
      return self.stats().activeCompany.numCustomers;
    }
  }, self);

  self.numInvoices = ko.pureComputed(function() {
    if ((self.activeCompanyId() === undefined) || (self.activeCompanyId() === null) ||
        (self.stats() === undefined)) {
      return 0;
    } else {
      return self.stats().activeCompany.numInvoices;
    }
  }, self);
  
  self.companiesTextTrans = ko.pureComputed(function() {
    if (self.numCompanies() > 0) {
      return t("app.gettingStarted.companiesText", {count: self.numCompanies()});
    } else {
      return t("app.gettingStarted.noCompaniesText");
    }
  }, self);

  self.customersTextTrans = ko.pureComputed(function() {
    if (self.numCustomers() > 0) {
      return t("app.gettingStarted.customersText", {count: self.numCustomers()});
    } else {
      return t("app.gettingStarted.noCustomersText");
    }
  }, self);

  self.invoicesTextTrans = ko.pureComputed(function() {
    if (self.numInvoices() > 0) {
      return t("app.gettingStarted.invoicesText", {count: self.numInvoices()});
    } else {
      return t("app.gettingStarted.noInvoicesText");
    }
  }, self);

  cache.on('set:' + Cache.CURR_USER_STATS(), function(stats, ttl) {
    Log.info("GettingStartedViewModel - event - set:" + Cache.CURR_USER_STATS());
    self.stats(stats);
  });

  cache.on('update:' + Cache.CURR_USER_STATS(), function(stats, ttl) {
    Log.info("GettingStartedViewModel - event - update:" + Cache.CURR_USER_STATS());
    self.stats(stats);
  });

  cache.on('del:' + Cache.CURR_USER_STATS(), function() {
    Log.info("GettingStartedViewModel - event - del:" + Cache.CURR_USER_STATS());
  });

  self.enable = function() {
    self.currentView.subscribe(function(newValue) {
      if (newValue == 'home') {
        Log.info("GettingStartedViewModel - activated");
        self.populatePromise();
      }
    });

    self.activeCompanyId.subscribe(function(newValue) {
      Log.info("GettingStartedViewModel - activeCompanyId.subscribe: value="
          + newValue);
      if (self.currentView() == 'home') {
        self.populatePromise(true);
      } else {
        cache.del(Cache.CURR_USER_STATS());
      }
    });

    self.enabled(true);
  };

  self.populatePromise = function(force) {
    force = typeof force !== 'undefined' ? force : false;
    var deferred = $.Deferred();
    // Do nothing if object exists in cache
    if (force || !cache.get(Cache.CURR_USER_STATS())) {
      Notify_showSpinner(true);
      $.getJSON(
          "/api/stats/" + self.activeCompanyId(),
          function(stats) {
            Log.info("Got stats id=" + self.activeCompanyId() + ", stats=" + JSON.stringify(stats));
            cache.set(Cache.CURR_USER_STATS(), stats);
            deferred.resolve();
          }).fail(function() {
            Log.info("GettingStartedViewModel - populate - failed");
            Notify_showMsg('error', t("app.gettingStarted.getNok"));
            deferred.reject();
          }).always(function() {
            Notify_showSpinner(false);
          });
    } else {
      Log.info("GettingStartedViewModel - populate - data is cached!");
      deferred.resolve();
    }
    return deferred.promise();
  };
};

var getInitialDataPromise = function() {
  var deferred = $.Deferred();
  Notify_showSpinner(true);
  $.getJSON(
    "/api/initial",
    function(data) {
      deferred.resolve(data);
    }
  )
  .fail(function() {
    Log.info("Failed to get initial data");
    deferred.reject(data);
  })
  .always(function() {
    Notify_showSpinner(false);
  });

  return deferred.promise();
}

var setupKo = function() {
  var navViewModel = new NavViewModel();
  var settings = new SettingsDataModel();
  var userData = new UserDataModel(navViewModel.userName)
  var companyViewModel = new CompanyListViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId, navViewModel.activeCompany, navViewModel.companyList);
  var settingsViewModel = new SettingsViewModel(navViewModel.currentView,
      settings, userData, navViewModel.activeCompanyId, companyViewModel.setActiveCompanyId);
  var gettingStartedViewModel = new GettingStartedViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId);

  getInitialDataPromise().done(function(data) {
    Log.info("Got initial data: " + JSON.stringify(data, null, 2));

    // Settings
    settingsViewModel.setData(data.settings);
    settingsViewModel.enable();

    // Companies
    cache.set(Cache.COMPANIES(), data.companies);

    // Stats
    cache.set(Cache.CURR_USER_STATS(), data.stats);
    gettingStartedViewModel.populatePromise().done(function() {
      gettingStartedViewModel.enable();
    });
  }).fail(function() {
    Notify_showMsg('error', t("app.settings.getInitialDataNok"));
  });
  
  var companyNewViewModel = new CompanyNewViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId, navViewModel.activeCompany);
  var customerListViewModel = new CustomerListViewModel(
      navViewModel.currentView, navViewModel.activeCompanyId);
  var customerNewViewModel = new CustomerNewViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId, navViewModel.companyList);
  var invoiceListViewModel = new InvoiceListViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId);
  var invoiceNewViewModel = new InvoiceNewViewModel(navViewModel.currentView, navViewModel.activeCompany);
  var invoiceItemGroupTemplatesViewModel = new InvoiceItemGroupTemplatesViewModel(
      navViewModel.currentView);

  ko.applyBindings(navViewModel, document.getElementById("app-navbar"));

  ko.applyBindings(companyViewModel, document.getElementById("app-companies"));

  ko.applyBindings(gettingStartedViewModel, document.getElementById("app-home"));

  ko.applyBindings(companyNewViewModel, document
      .getElementById("app-company_new"));

  ko.applyBindings(customerListViewModel, document
      .getElementById("app-customer"));

  ko.applyBindings(customerNewViewModel, document
      .getElementById("app-customer_new"));

  ko.applyBindings(invoiceListViewModel, document
      .getElementById("app-invoices"));

  ko.applyBindings(invoiceNewViewModel, document
      .getElementById("app-invoice_new"));

  ko.applyBindings(invoiceItemGroupTemplatesViewModel,document.getElementById("app-invoice_item_group_templates"));

  ko.applyBindings(settingsViewModel, document.getElementById("app-settings"));
  if (cfg.user.isAdmin) {
    var debugViewModel = new DebugViewModel(navViewModel.currentView);
    var userListViewModel = new UserListViewModel(navViewModel.currentView);
    var inviteListViewModel = new InviteListViewModel(navViewModel.currentView);
    ko.applyBindings(debugViewModel, document.getElementById("app-debug"));
    ko.applyBindings(userListViewModel, document.getElementById("app-users"));
    ko.applyBindings(inviteListViewModel, document.getElementById("app-invites"));
  }

  // Hide initial spinner
  Notify_showSpinner(false);
};

$(function() {
  Log.info("init - load translations");
  i18next
    .use(window.i18nextXHRBackend)
    .init({
      lng: defaults.defaultLng,
      useLocalStorage: false,
      whitelist: defaults.enabledLngList.slice(0),
      preload: defaults.enabledLngList.slice(0),
      fallbackLng: defaults.defaultLng,
      sendMissing: false,
      debug: true,
      joinArrays: ' ',
      backend: {
        // path where resources get loaded from
        loadPath: 'locales/resources.json?lng={{lng}}&ns={{ns}}',
        // your backend server supports multiloading
        // /locales/resources.json?lng=de+en&ns=ns1+ns2
        allowMultiLoading: true,
        // allow cross domain requests
        crossDomain: false,
      }
    }, function(err, tFunc) {
      if (err) {
        Log.warn("i18next init error: " + err);
      }
      i18nTFunc = tFunc;
      Log.info("init - load translations - done");
      Log.info("init - setupKo");
      setupKo();
      Log.info("init - setupKo - done");
  });  
});
