function Log(){};

Log._getCallerInfo = function() {
  var err = undefined;
  try { throw Error(''); } catch(e) { err = e; }
  var callerLine = err.stack.split("\n")[4];
  var callerFuncStart = callerLine.indexOf("at ") + 3;
  return callerLine.slice(callerFuncStart, callerLine.length);
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
    });undoNavigation
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

  self.fetchInvoices = function(companyId) {
    return $.getJSON("/api/invoices/" + companyId, function(data) {
      cache.set(self.INVOICES(), data);
    });
  };

  self.getInvoice = function(id, callback) {
    self._arrayGetItem(self.INVOICES(), '_id', id, callback);
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
};

var Cache = new CacheOp();

var browserNavigateBack = function() {
  Log.info("Forced backward navigation");
  history.go(-1);
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
  
  self.getJson = function() {
    var data = {
        _id: self._id(),
        activeCompanyId: self.activeCompanyId(),
        license: self.license(),
    };
    return data;
  };
};

var SettingsViewModel = function(currentView, settings, activeCompanyId,
    setActiveCompanyId) {
  var self = this;

  self.currentView = currentView;
  self.activeCompanyId = activeCompanyId;
  self.setActiveCompanyId = setActiveCompanyId;

  self.settings = settings;

  self.currentView.subscribe(function(newValue) {
    if (newValue == 'settings') {
      Log.info("SettingsViewModel - activated");
    }
  });

  self.populate = function(isPopulatedCb) {
    Notify_showSpinner(true);
    $.getJSON(
        "/api/settings",
        function(settings) {
          self.settings.setData(settings);
          self.setActiveCompanyId(settings.activeCompanyId);
          self.activeCompanyId.subscribe(function(newValue) {
            Log.info("SettingsViewModel - Active company change detected: ID="
                  + newValue);
            self.settings.setActiveCompanyId(newValue);
            self.saveSettings();
          });
          Notify_showSpinner(false);
          isPopulatedCb();
        }).fail(function() {
          Log.info("SettingsViewModel - populate - failed");
          Notify_showSpinner(false);
          Notify_showMsg('error', i18n.t("app.settings.getNok"));
        });
  };
  
  self.saveSettings = function() {
    var ajaxData = self.settings.getJson();
    var ajaxUrl = "/api/settings";
    Log.info("saveSettings: AJAX PUT (url=" + ajaxUrl + "): JSON="
        + JSON.stringify(ajaxData));
    Notify_showSpinner(true, i18n.t("app.settings.saveTicker"));
    return $.ajax({
      url : ajaxUrl,
      type : "PUT",
      contentType : "application/json",
      data : JSON.stringify(ajaxData),
      dataType : "json",
      success : function(data) {
        Log.info("saveSettings: response: " + JSON.stringify(data));
        Notify_showSpinner(false);
        Notify_showMsg('success', i18n.t("app.settings.saveOk"));
      },
    });
  };

  self.invalidateCache = function() {
    var cacheRecords = cache.clear();
    Log.info("Cache cleared. Had " + cacheRecords + " records.");
  };
};

var CompanyViewModel = function() {
  var self = this;

  self._id = ko.observable();
  self.uid = ko.observable();
  self.name = ko.observable();
  self.addr1 = ko.observable();
  self.addr2 = ko.observable();
  self.addr3 = ko.observable();
  self.contact1Caption = ko.observable();
  self.contact2Caption = ko.observable();
  self.contact3Caption = ko.observable();
  self.contact1 = ko.observable();
  self.contact2 = ko.observable();
  self.contact3 = ko.observable();
  self.payment1Caption = ko.observable();
  self.payment2Caption = ko.observable();
  self.payment3Caption = ko.observable();
  self.payment1 = ko.observable();
  self.payment2 = ko.observable();
  self.payment3 = ko.observable();
  self.paymentFocus = ko.observable();
  self.paymentCustomText = ko.observable();
  self.defaultNumDaysUntilPayment = ko.observable();
  self.vatNr = ko.observable();
  self.orgNr = ko.observable();
  self.vatNrCustomText = ko.observable();
  self.reverseChargeText = ko.observable();
  self.isValid = ko.observable();
  self.logo = ko.observable();
  self.nextCid = ko.observable();
  self.nextIid = ko.observable();
  self.nameError = ko.observable(false);
  self.hasErrorCss = ko.pureComputed(function() {
    // return this.nameError() ? "has-error" : "";
    return this.nameError() ? "highlighterror" : "";
  }, self);
  
  self.setData = function(data) {
    self._id(data._id);
    self.uid(data.uid);
    self.name(data.name);
    self.addr1(data.addr1);
    self.addr2(data.addr2);
    self.addr3(data.addr3);
    self.contact1Caption(data.contact1Caption);
    self.contact2Caption(data.contact2Caption);
    self.contact3Caption(data.contact3Caption);
    self.contact1(data.contact1);
    self.contact2(data.contact2);
    self.contact3(data.contact3);
    self.payment1Caption(data.payment1Caption);
    self.payment2Caption(data.payment2Caption);
    self.payment3Caption(data.payment3Caption);
    self.payment1(data.payment1);
    self.payment2(data.payment2);
    self.payment3(data.payment3);
    self.paymentFocus(data.paymentFocus);
    self.paymentCustomText(data.paymentCustomText);
    self.defaultNumDaysUntilPayment(data.defaultNumDaysUntilPayment);
    self.vatNr(data.vatNr);
    self.orgNr(data.orgNr);
    self.vatNrCustomText(data.vatNrCustomText);
    self.reverseChargeText(data.reverseChargeText);
    self.isValid(data.isValid);
    self.logo(data.logo);
    self.nextCid(data.nextCid);
    self.nextIid(data.nextIid);
  };
  
  self.init = function() {
    var data = {
        _id : undefined,
        uid : undefined,
        name : "",
        addr1 : "",
        addr2 : "",
        addr3 : "",
        contact1Caption : i18n.t("app.company.defaultContact1Caption"),
        contact2Caption : i18n.t("app.company.defaultContact2Caption"),
        contact3Caption : i18n.t("app.company.defaultContact3Caption"),
        contact1 : "",
        contact2 : "",
        contact3 : "",
        payment1Caption : i18n.t("app.company.defaultPayment1Caption"),
        payment2Caption : i18n.t("app.company.defaultPayment2Caption"),
        payment3Caption : "",
        payment1 : "",
        payment2 : "",
        payment3 : "",
        paymentFocus : "1",
        paymentCustomText : i18n.t("app.company.defaultPaymentCustomText"),
        defaultNumDaysUntilPayment : 30,
        vatNr : "",
        orgNr : "",
        vatNrCustomText : i18n.t("app.company.defaultVatNrCustomText"),
        reverseChargeText : i18n.t("app.company.defaultReverseChargeCustomText"),
        isValid : true,
        logo : undefined,
        nextCid : 100,
        nextIid : 100
      };
    self.setData(data);
  };
  
  self.init();
  
  self.setDefaultReverseChargeCustomText = function() {
    self.reverseChargeText(i18n.t("app.company.defaultReverseChargeCustomText"));
  };

  self.updateServer = function(onCompletion) {
    if ((self._id() == undefined) && !self.isValid()) {
      Notify_showMsg('error', i18n.t("app.company.saveNok"));
      return;
    } else if (self.name().length == 0) {
      Notify_showMsg('error', i18n.t("app.company.saveNok", {context: "noName"}));
      self.nameError(true);
      return;
    }
    self.nameError(false);
    var isNew = (self._id() == undefined) ? true : false;
    Notify_showSpinner(true, i18n.t("app.company.saveTicker"));
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
        Notify_showMsg('success', i18n.t("app.company.saveOk",
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
      contact1Caption : self.contact1Caption(),
      contact2Caption : self.contact2Caption(),
      contact3Caption : self.contact3Caption(),
      contact1 : self.contact1(),
      contact2 : self.contact2(),
      contact3 : self.contact3(),
      payment1Caption : self.payment1Caption(),
      payment2Caption : self.payment2Caption(),
      payment3Caption : self.payment3Caption(),
      payment1 : self.payment1(),
      payment2 : self.payment2(),
      payment3 : self.payment3(),
      paymentFocus : self.paymentFocus(),
      paymentCustomText : self.paymentCustomText(),
      defaultNumDaysUntilPayment : self.defaultNumDaysUntilPayment(),
      vatNr : self.vatNr(),
      orgNr : self.orgNr(),
      vatNrCustomText : self.vatNrCustomText(),
      reverseChargeText : self.reverseChargeText(),
      isValid : self.isValid(),
      logo : self.logo(),
      nextCid : parseInt(self.nextCid()),
      nextIid : parseInt(self.nextIid()),
    };
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
      Cache.fetchCompanies().success(function() {
        Notify_showSpinner(false);
      }).fail(function() {
        Log.info("CompanyListViewModel - populate - failed");
        Notify_showSpinner(false);
        Notify_showMsg('error', i18n.t("app.companyList.getNok"));
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
  
  self.logoPath = ko.pureComputed(function() {
    var path = "";
    if (self.data._id() !== undefined && self.data.logo() !== undefined) {
      path = "/api/company_logo/" + self.data._id();
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
              Notify_showMsg('error', i18n.t("app.company.getNok"));
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
    Log.info("CompanyNewViewModel - uploadLogo: companyId=" + _id + ", logo=" + formElement.elements.logo.value);
    Log.info("form data: " + JSON.stringify(formElement));
    var submitForm = false;
    if (_id === undefined) {
      Notify_showMsg('error', i18n.t("app.company.uploadLogoNok", {context: "noId"}));
    } else if (formElement.elements.logo.value.length == 0) {
      Notify_showMsg('error', i18n.t("app.company.uploadLogoNok", {context: "noFile"}));
    } else {
      formElement.action = "/api/company_logo/" + _id;
      submitForm = true;
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
  self.useReverseCharge = ko.observable();
  self.isValid = ko.observable();
  self.companyId = ko.observable();
  
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
    self.useReverseCharge(data.useReverseCharge);
    self.isValid(data.isValid);
    self.companyId(data.companyId);
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
      useReverseCharge : false,
      isValid : true,
    };
    self.setData(data);
  };
  
  self.init();

  self.setActiveCompanyId = function(companyId) {
    self.companyId(companyId);
  };

  self.updateServer = function() {
    if (self.companyId() == null) {
      Notify_showMsg('error', i18n.t("app.customer.saveNok", {context: "noCompany"}));
      return;
    } else if ((self._id() == undefined) && !self.isValid()) {
      Log.info("updateServer: Nothing to do (invalid entry without _id)");
      Notify_showMsg('error', i18n.t("app.customer.saveNok"));
      return;
    } else if (self.name().length == 0) {
      Notify_showMsg('error', i18n.t("app.customer.saveNok", {context: "noName"}));
      self.nameError(true);
      return;
    }
    self.nameError(false);
    var isNewCustomer = (self._id() == undefined) ? true : false;
    Notify_showSpinner(true, i18n.t("app.customer.saveTicker"));
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
        Notify_showMsg('success', i18n.t("app.customer.saveOk",
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
      useReverseCharge : self.useReverseCharge(),
      isValid : self.isValid()
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
        Cache.fetchCustomers(companyId).success(function() {
          Log.info("CustomerListViewModel - populate - success");
          Notify_showSpinner(false);
        }).fail(function() {
          Log.info("CustomerListViewModel - populate - failed");
          Notify_showSpinner(false);
          Notify_showMsg('error', i18n.t("app.customerList.getNok"));
        });
      } else {
        Log.info("CustomerListViewModel - populate - data is cached!");
      }
    } else {
      Notify_showMsg('info', i18n.t("app.customerList.getNok", {context: "noCompany"}));
      browserNavigateBack();
    }
  };
};

var CustomerNewViewModel = function(currentView, activeCompanyId) {
  var self = this;

  self.data = new CustomerViewModel();

  self.currentView = currentView;
  self.activeCompanyId = activeCompanyId;
  
  self.currentView.subscribe(function(newValue) {
    self.data.init();
    var viewArray = newValue.split("/");
    if (viewArray[0] == 'customer_new') {
      Log.info("CustomerNewViewModel - activated");
      if (self.activeCompanyId() != null) {
        self.data.init();
        self.data.setActiveCompanyId(self.activeCompanyId());
      } else {
        Notify_showMsg('info', i18n.t("app.customer.newNok", {context: "noCompany"}));
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
              Notify_showMsg('error', i18n.t("app.customer.getNok"));
            });
      }
    });
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
      Cache.fetchItemGroupTemplates().success(function() {
        Notify_showSpinner(false);
      }).fail(function() {
        Log.info("InvoiceItemGroupTemplatesViewModel - populate - failed");
        Notify_showSpinner(false);
        Notify_showMsg('error', i18n.t("app.groupTemplates.getNok"));
      });
    } else {
      Log.info("InvoiceItemGroupTemplatesViewModel - populate - data is cached!");
    }
  };

  self.deleteGroup = function(group) {
    group.updateServerDelete();
    self.groupList.destroy(group);
  };
};

// Trick for doing classmethods...
function InvoiceOps(){};
InvoiceOps.printInvoice = function(id) {
  Log.info("printInvoice - id=" + id);
  if (id !== undefined) {
    Notify_showSpinner(true);
    try {
      var child = window.open("/api/invoiceReport/" + id);
      $(child).ready(function() {
        Log.info("printInvoice - Report done!");
        Notify_showSpinner(false);
      });
      child.focus();
    } catch (e) {
      Log.info("printInvoice - Failed!");
      Notify_showSpinner(false);
    }
  } else {
    Log.info("printInvoice - failure, undefined id");
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
      return i18n.t("app.invoice.groupNumInvoiceItemsText", {count: self.numInvoiceItems()});
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
          isTextOnly: false,
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
    if ((self._id() == undefined) && !self.isValid()) {
      Notify_showMsg('error', i18n.t("app.groupTemplates.saveNok"));
      return;
    } else if (self.name().length == 0) {
      Notify_showMsg('error', i18n.t("app.groupTemplates.saveNok", {context: "noName"}));
      self.nameError(true);
      return;
    }
    self.nameError(false);
    var isNew = (self._id() == undefined) ? true : false;
    Notify_showSpinner(true, i18n.t("app.groupTemplates.saveTicker"));
    return $.ajax({
      url : "/api/itemGroupTemplate/" + self._id(),
      type : "PUT",
      contentType : "application/json",
      data : JSON.stringify(self.getJson()),
      dataType : "json",
      success : function(data) {
        Log.info("updateServer: response: " + JSON.stringify(data));
        var tContext = "";
        var isDelete = !isNew && !data.groupTempl.isValid;
        if (!isNew) {
          tContext = isDelete ? 'delete' : 'update';
        }
        Notify_showSpinner(false);
        Notify_showMsg('success', i18n.t("app.groupTemplates.saveOk",
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
    self.updateServer();
  };

  self.getJson = function() {
    var res = {
      _id : self._id(),
      uid : self.uid(),
      name : self.name(),
      title : self.title(),
      isValid : self.isValid(),
      isQuickButton : self.isQuickButton(),
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
        items.push(self.invoiceItems()[i].getJson());
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

  self.getJson = function() {
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
  self.iid = ko.observable();
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
  self.currency = ko.observable();
  self.invoiceItemGroups = ko.observableArray();
  self.invoiceItems = ko.observableArray();

  self.setData = function(newData) {
    self._id(newData._id);
    self.iid(newData.iid);
    self.uid(newData.uid);
    self.companyId(newData.companyId);
    self.company(newData.company);
    self.isValid(newData.isValid);
    self.isCanceled(newData.isCanceled);
    self.isPaid(newData.isPaid);
    self.isCredit(newData.isCredit);
    self.isLocked(newData.isLocked);
    self.customer(newData.customer);
    self.yourRef(newData.yourRef);
    self.ourRef(newData.ourRef);
    self.date(newData.date);
    self.daysUntilPayment(newData.daysUntilPayment);
    self.projId(newData.projId);
    self.currency(newData.currency);

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

  self.setCurrency = function(currency) {
    self.currency(currency);
  };

  self.init = function(defaultNumDaysUntilPayment) {
    var data = {
      _id : undefined,
      iid : undefined,
      uid : undefined,
      companyId : undefined,
      company: undefined,
      customer : {
        _id : undefined,
        cid : undefined,
        name : "",
        addr1 : "",
        addr2 : "",
      },
      yourRef : "",
      ourRef : "",
      // Initialize to current date
      date : new Date().toISOString().split("T")[0],
      daysUntilPayment : defaultNumDaysUntilPayment,
      projId : "",
      currency : "SEK",
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
    for ( var i = 0; i < this.invoiceItemGroups().length; i++) {
      if (this.invoiceItemGroups()[i].isValid()) {
        sum += this.invoiceItemGroups()[i].totalExclVat();
      }
    }
    if (self.isCredit()) {
      sum = -sum;
    }
    return sum;
  }, this);
  
  self.totalInclVat = ko.pureComputed(function() {
    var sum = 0;
    for ( var i = 0; i < this.invoiceItemGroups().length; i++) {
      if (this.invoiceItemGroups()[i].isValid()) {
        sum += this.invoiceItemGroups()[i].totalInclVat();
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

  self.setCustomer = function(data) {
    self.customer(data);
  };
  
  self.forceMarkAsNew = function() {
    self._id(undefined);
    self.iid(undefined);
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

  self.getJson = function() {
    var groups = [];
    for ( var i = 0; i < self.invoiceItemGroups().length; i++) {
      groups.push(self.invoiceItemGroups()[i].getJson());
    }
    var res = {
      _id : self._id(),
      iid : self.iid(),
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
      currency : self.currency(),
      invoiceItemGroups : groups,
      totalExclVat : self.totalExclVat(),
      totalInclVat : self.totalInclVat()
    };
    return res;
  };
};

var InvoiceListDataViewModel = function(data) {
  var self = this;
  self._id = ko.observable(data._id);
  self.iid = ko.observable(data.iid);
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
  self.currency = ko.observable(data.currency);
  self.totalExclVat = ko.observable(data.totalExclVat);
  self.totalInclVat = ko.observable(data.totalInclVat);
  self.totalExclVatStr = ko.pureComputed(function() {
    return Util.formatCurrency(self.totalExclVat(), {currencyStr: self.currency()});
  }, self);
  self.totalInclVatStr = ko.pureComputed(function() {
    return Util.formatCurrency(self.totalInclVat(), {currencyStr: self.currency()});
  }, self);
  self.isOverdue = ko.pureComputed(function() {
    var overdue = false;
    if (self.daysUntilPayment() !== undefined && parseInt(self.daysUntilPayment()) >= 0)
    {
      var invoiceDate = new Date(self.date());
      var invoiceAgeMs = Date.now() - invoiceDate.valueOf();
      var invoiceAgeDays = invoiceAgeMs / (1000 * 3600 * 24);
      Log.info("Invoice isOverdue: iid=" + self.iid() + ", date="
          + invoiceDate + ", ageInDays=" + invoiceAgeDays + ", daysUntilPayment="
          + self.daysUntilPayment());
      if (invoiceAgeDays > parseInt(self.daysUntilPayment())) {
        Log.info("Invoice " + self.iid() + " is overdue!");
        overdue = true;
      }
    }
    else
    {
      Log.info("Invoice isOverdue: iid=" + self.iid() + ", not valid daysUntilPayment="
          + self.daysUntilPayment());
    }
    return overdue;
  });

  self.printInvoice = function() {
    Log.info("InvoiceListDataViewModel - Report requested");
    if (self._id() !== undefined) {
      InvoiceOps.printInvoice(self._id());
    } else {
      Notify_showMsg('error', i18n.t("app.invoiceList.printNok", {context: "noId"}));
      Log.info("InvoiceListDataViewModel - Invoice has no id.");
    }
  };
};

var InvoiceListViewModel = function(currentView, activeCompanyId) {
  var self = this;

  self.currentView = currentView;
  self.activeCompanyId = activeCompanyId;
  self.showPaid = ko.observable(true);
  self.showCredit = ko.observable(true);
  self.showCanceled = ko.observable(true);
  self.invoiceListSort = ko.observable('iidAsc');

  self.currentView.subscribe(function(newValue) {
    if (newValue == 'invoices') {
      Log.info("InvoiceListViewModel - activated");
      self.populate();
    }
  });

  self.activeCompanyId.subscribe(function(newValue) {
    Log.info("InvoiceListViewModel - activeCompanyId.subscribe: value="
        + newValue);
    if (self.currentView() == 'invoices') {
      self.populate(true);
    } else {
      Cache.invalidateInvoices();
    }
  });

  // Invoice part
  self.invoiceList = ko.observableArray();

  cache.on('set:' + Cache.INVOICES(), function(invoices, ttl) {
    Log.info("InvoiceListViewModel - event - set:" + Cache.INVOICES());
    var mappedInvoices = $.map(invoices, function(item) {
      return new InvoiceListDataViewModel(item);
    });
    self.invoiceList(mappedInvoices);
  });

  cache.on('update:' + Cache.INVOICES(), function(invoices, ttl) {
    Log.info("InvoiceListViewModel - event - update:" + Cache.INVOICES());
    var mappedInvoices = $.map(invoices, function(item) {
      return new InvoiceListDataViewModel(item);
    });
    self.invoiceList(mappedInvoices);
  });

  cache.on('del:' + Cache.INVOICES(), function() {
    Log.info("InvoiceListViewModel - event - del:" + Cache.INVOICES());
    self.invoiceList.removeAll();
  });

  self.populate = function(force) {
    force = typeof force !== 'undefined' ? force : false;
    var companyId = self.activeCompanyId();
    if (companyId != null) {
      // Do nothing if object exists in cache
      if (force || !cache.get(Cache.INVOICES())) {
        Notify_showSpinner(true);
        Cache.fetchInvoices(companyId).success(function() {
          Log.info("InvoiceListViewModel - populate - success");
          Notify_showSpinner(false);
        }).fail(function() {
          Log.info("InvoiceListViewModel - populate - failed");
          Notify_showSpinner(false);
          Notify_showMsg('error', i18n.t("app.invoiceList.getNok"));
        });
      } else {
        Log.info("InvoiceListViewModel - populate - data is cached!");
      }
    } else {
      Notify_showMsg('info', i18n.t("app.invoiceList.getNok", {context: "noCompany"}));
      browserNavigateBack();
    }
  };
  
  self.doToggleShowPaid = function() {
    self.showPaid(!self.showPaid());
    Log.info("InvoiceListViewModel - showPaid=" + self.showPaid()
        + " (new state)");
  };
  
  self.doToggleShowCredit = function() {
    self.showCredit(!self.showCredit());
    Log.info("InvoiceListViewModel - showCredit=" + self.showCredit()
        + " (new state)");
  };

  self.doToggleShowCanceled = function() {
    self.showCanceled(!self.showCanceled());
    Log.info("InvoiceListViewModel - showCanceled=" + self.showCanceled()
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
    self.invoiceList.sort(self[newVal + 'Compare']);
  });
  
  self.iidAscCompare = function(aRow, bRow) {
    return aRow.iid() - bRow.iid();
  };

  self.iidDescCompare = function(aRow, bRow) {
    return self.iidAscCompare(bRow, aRow);
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

  self.paidAscCompare = function(aRow, bRow) {
    return aRow.isPaid() - bRow.isPaid();
  };

  self.paidDescCompare = function(aRow, bRow) {
    return self.paidAscCompare(bRow, aRow);
  };

  self.canceledAscCompare = function(aRow, bRow) {
    return aRow.isCanceled() - bRow.isCanceled();
  };

  self.canceledDescCompare = function(aRow, bRow) {
    return self.canceledAscCompare(bRow, aRow);
  };

  self.creditAscCompare = function(aRow, bRow) {
    return aRow.isCredit() - bRow.isCredit();
  };

  self.creditDescCompare = function(aRow, bRow) {
    return self.creditAscCompare(bRow, aRow);
  };

  self.totalExclVatAscCompare = function(aRow, bRow) {
    return aRow.totalExclVat() - bRow.totalExclVat();
  };

  self.totalExclVatDescCompare = function(aRow, bRow) {
    return self.totalExclVatAscCompare(bRow, aRow);
  };
};

var InvoiceCustomerModel = function(data) {
  var self = this;
  self.data = data;
  self.toString = function() {
    return "" + self.data.cid + " - " + self.data.name;
  };
};

var InvoiceNewViewModel = function(currentView, activeCompanyId, activeCompany) {
  var self = this;

  self.data = new InvoiceDataViewModel();

  self.currentView = currentView;
  self.activeCompanyId = activeCompanyId;
  self.activeCompany = activeCompany;
  self.customerList = ko.observableArray();
  self.selectedCustomer = ko.observable();
  self.currencyList = ko.observableArray(["SEK", "EUR", "USD", "GBP"]);
  self.selectedCurrency = ko.observable();
  self.getJobs = [];
  self.numServerReqLeft = 0;

  self.itemGroupList = ko.observableArray();
  
  self.newGroup = function(g) {
    var group = ko.toJS(g)
    Log.info("New group name=" + group.name + ", id=" + group._id);
    self.data.addGroup(group);
  };
  
  self.currentView.subscribe(function(newValue) {
    self.data.init();
    self.selectedCustomer(undefined);
    var viewArray = newValue.split("/");
    if (viewArray[0] == 'invoice_new') {
      Log.info("InvoiceNewViewModel - activated");
      if (self.activeCompany() !== undefined) {
        self.data.init(self.activeCompany().defaultNumDaysUntilPayment());
        self.data.setCompanyId(self.activeCompanyId());
        self.numServerReqLeft = 1;
        self.populate();
      } else {
        Notify_showMsg('info', i18n.t("app.invoice.newNok", {context: "noCompany"}));
        browserNavigateBack();
      }
    } else if (viewArray[0] == 'invoice_show' && viewArray.length > 1) {
      var _id = viewArray[1];
      Log.info("InvoiceNewViewModel - activated - show #" + _id);
      self.numServerReqLeft = 2;
      self.getInvoice(_id);
      self.populate();
    }
  });
  
  self.selectedCustomer.subscribe(function(newValue) {
    if (newValue !== undefined && newValue.data !== undefined) {
      Log.info("InvoiceNewViewModel - Customer selected - "
          + JSON.stringify(newValue.data));
      self.data.setCustomer(newValue.data);
    }
  });

  self.selectedCurrency.subscribe(function(newValue) {
    if (newValue !== undefined) {
      Log.info("InvoiceNewViewModel - Currency selected - "
          + newValue);
      self.data.setCurrency(newValue);
    }
  });

  cache.on('set:' + Cache.CUSTOMERS(), function(customers, ttl) {
    Log.info("InvoiceNewViewModel - event - set:" + Cache.CUSTOMERS());
    var mappedCustomers = $.map(customers, function(item) {
      return new InvoiceCustomerModel(item);
    });
    self.customerList(mappedCustomers);
  });

  cache.on('update:' + Cache.CUSTOMERS(), function(customers, ttl) {
    Log.info("InvoiceNewViewModel - event - update:" + Cache.CUSTOMERS());
    var mappedCustomers = $.map(customers, function(item) {
      return new InvoiceCustomerModel(item);
    });
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

  self.populate = function(force) {
    force = typeof force !== 'undefined' ? force : false;
    var companyId = self.activeCompanyId();
    if (companyId != null) {
      var customersJob = undefined;
      var groupTemplatesJob = undefined;
      // Do nothing if object exists in cache
      if (force || !cache.get(Cache.CUSTOMERS())) {
        customersJob = Cache.fetchCustomers(companyId);
      } else {
        Log.info("InvoiceNewViewModel - populate - customer data is cached!");
        customersJob = $.Deferred();
        customersJob.resolve();
      }

      if (force || !cache.get(Cache.ITEM_GROUP_TEMPLATES())) {
        groupTemplatesJob = Cache.fetchItemGroupTemplates();
      } else {
        Log.info("InvoiceNewViewModel - populate - groupTemplate data is cached!");
        groupTemplatesJob = $.Deferred();
        groupTemplatesJob.resolve();
      }

      Notify_showSpinner(true);
      $.when(customersJob, groupTemplatesJob).then(function(customersRes, groupTemplatesRes) {
        self.numServerReqLeft--;
        self.syncCustomerIdInput();
        Notify_showSpinner(false);
      }).fail(function() {
         Log.info("InvoiceNewViewModel - populate - failed");
         Notify_showSpinner(false);
         Notify_showMsg('error', i18n.t("app.invoice.getGroupTemplatesNok"));
         Notify_showMsg('error', i18n.t("app.invoice.getCustomersNok"));
      });
    } else {
      Notify_showMsg('info', i18n.t("app.invoice.getCustomersNok", {context: "noCompany"}));
      browserNavigateBack();
    }
  };

  self.getInvoice = function(_id) {
    Cache.getInvoice(_id, function(cachedInvoice) {
      var doOnInvoice = function(invoice) {
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
          Log.info("Detected old invoice id=" + invoice._id +
            " format without item groups. Converting invoice using group name=" + groupToUse.name);
          var newGroup = JSON.parse(JSON.stringify(groupToUse));
          newGroup.invoiceItems = invoice.invoiceItems;
          invoice.invoiceItemGroups = [newGroup];
        }
        self.data.setData(invoice);
        self.selectedCustomer(self.data.customer());
        self.selectedCurrency(self.data.currency());
        self.numServerReqLeft--;
        self.syncCustomerIdInput();
      };

      if (cachedInvoice !== undefined) {
        doOnInvoice(cachedInvoice);
      } else {
        Notify_showSpinner(true);
        $.getJSON(
            "/api/invoice/" + _id,
            function(invoice) {
              Log.info("Got invoice id=" + _id + ", data=" + JSON.stringify(invoice));
              doOnInvoice(invoice);
              Notify_showSpinner(false);
            }).fail(function() {
              Log.info("InvoiceNewViewModel - getInvoice - failed");
              self.numServerReqLeft--;
              Notify_showSpinner(false);
              Notify_showMsg('error', i18n.t("app.invoice.getNok"));
            });
      }
    });
  };
  
  self.syncCustomerIdInput = function() {
    if (self.numServerReqLeft === 0) {
      Log.info("InvoiceNewViewModel - syncCustomerIdInput");
      var cid = self.data.customer().cid;
      if (cid !== undefined) {
        for (var i = 0; i < self.customerList().length; i++) {
          if (cid === self.customerList()[i].data.cid) {
            Log.info("InvoiceNewViewModel - syncCustomerIdInput: cid=" + cid + " found");
            self.selectedCustomer(self.customerList()[i]);
            break;
          }
        }
      } else {
        Log.info("InvoiceNewViewModel - syncCustomerIdInput: customer.cid is undefined");        
      }
    }
  };

  self.saveInvoice = function() {
    if ((self.data._id() === undefined) && !self.data.isValid()) {
      Notify_showMsg('error', i18n.t("app.invoice.saveNok"));
      Log.info("saveInvoice: Nothing to do (invalid entry without _id)");
      return;
    } else if (self.data.customer()._id === undefined) {
      Notify_showMsg('error', i18n.t("app.invoice.saveNok", {context: 'invalidCustomer'}));
      Log.info("No customer selected: " + JSON.stringify(self.data.customer()));
      return;
    } else if (self.data.date() === undefined) {
      Notify_showMsg('error', i18n.t("app.invoice.saveNok", {context: 'invalidDate'}));
      return;
    }
    var isNewInvoice = (self.data._id() == undefined) ? true : false;
    var ajaxData = JSON.stringify(self.data.getJson());
    var ajaxUrl = "/api/invoice/" + self.data._id();
    Log.info("saveInvoice: AJAX PUT (url=" + ajaxUrl + "): JSON="
        + ajaxData);
    Notify_showSpinner(true, i18n.t("app.invoice.saveTicker"));
    return $.ajax({
      url : ajaxUrl,
      type : "PUT",
      contentType : "application/json",
      data : ajaxData,
      dataType : "json",
      success : function(data) {
        Log.info("saveInvoice: response: " + JSON.stringify(data));
        var tContext = "";
        if (!isNewInvoice) {
          tContext = (data.invoice.isValid) ? 'update' : 'delete';
        }
        Notify_showSpinner(false);
        Notify_showMsg('success',
            i18n.t("app.invoice.saveOk",
                   {context: tContext, iid: data.invoice.iid}));
        // Set params set from server
        self.data._id(data.invoice._id);
        self.data.iid(data.invoice.iid);
        self.data.uid(data.invoice.uid);
        self.data.companyId(data.invoice.companyId);
        self.data.company(data.invoice.company);
        self.data.isValid(data.invoice.isValid);
        if (isNewInvoice) {
          cache.del(Cache.CURR_USER_STATS());
          Cache.addInvoice(data.invoice);
        } else {
          Cache.updateInvoice(data.invoice);
        };
      },
    });
  };
  
  self.doInvoicePrint = function() {
    Log.info("InvoiceNewViewModel - Print requested");
    if (self.data._id() !== undefined) {
      InvoiceOps.printInvoice(self.data._id());
    } else {
      Notify_showMsg('info', i18n.t("app.invoice.printNok", {context: 'noId'}));
      Log.info("InvoiceNewViewModel - Invoice not saved.");
    }
  };
  
  self.doCopyInvoice = function() {
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
      "isAdmin": ko.observable()
  };
  self.settings = ko.observable();
  self.isDetailsVisible = ko.observable(false);
  self.totalStats = ko.observable();
  
  self.setData = function(data) {
    self._id(data._id);
    self.googleId(data.googleId);
    self.info.name(data.info.name);
    self.info.email(data.info.email);
    self.info.registrationDate(data.info.registrationDate);
    self.info.isAdmin(data.info.isAdmin);
    self.settings(data.settings);
    self.isDetailsVisible(false);
    self.totalStats({
      "numCompanies": 0,
      "numCustomers": 0,
      "numInvoices": 0
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
            Notify_showMsg('error', i18n.t("app.userList.getNok"));
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
        Notify_showMsg('error', i18n.t("app.userList.getNok"));
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
        Notify_showMsg('error', i18n.t("app.inviteList.getNok"));
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
    title : i18n.t("app.navBar.home"),
    icon : 'glyphicon glyphicon-home',
    location : 'main'
  });
  self.mainViews.push({
    name : '/page/companies',
    title : i18n.t("app.navBar.companyAdmin"),
    icon : 'glyphicon glyphicon-wrench',
    location : 'companyMenu'
  });
  self.mainViews.push({
    name : '/page/customer_new',
    title : i18n.t("app.navBar.customerNew"),
    icon : 'glyphicon glyphicon-user',
    location : 'main'
  });
  self.mainViews.push({
    name : '/page/customers',
    title : i18n.t("app.navBar.customerList"),
    icon : 'glyphicon glyphicon-user',
    location : 'main'
  });
  self.mainViews.push({
    name : '/page/invoice_new',
    title : i18n.t("app.navBar.invoiceNew"),
    icon : 'glyphicon glyphicon-file',
    location : 'main'
  });
  self.mainViews.push({
    name : '/page/invoices',
    title : i18n.t("app.navBar.invoiceList"),
    icon : 'glyphicon glyphicon-th-list',
    location : 'main'
  });
  self.mainViews.push({
    name : '/page/invoice_item_group_templates',
    title : i18n.t("app.navBar.invoiceItemGroupTemplates"),
    icon : 'glyphicon glyphicon-list-alt',
    location : 'userMenu'
  });
  self.mainViews.push({
    name : '/page/settings',
    title : i18n.t("app.navBar.settings"),
    icon : 'glyphicon glyphicon-wrench',
    location : 'userMenu'
  });
  if (cfg.isAdmin) {
    self.mainViews.push({
      name : '/page/debug',
      title : i18n.t("app.navBar.debug"),
      icon : 'glyphicon glyphicon-eye-open',
      location : 'userMenu'
    });
    self.mainViews.push({
      name : '/page/users',
      title : i18n.t("app.navBar.users"),
      icon : 'glyphicon glyphicon-user',
      location : 'userMenu'
    });
    self.mainViews.push({
      name : '/page/invites',
      title : i18n.t("app.navBar.invites"),
      icon : 'glyphicon glyphicon-user',
      location : 'userMenu'
    });
  }
  self.mainViews.push({
    name : '/logout',
    title : i18n.t("app.navBar.logout"),
    icon : 'glyphicon glyphicon-log-out',
    location : 'userMenuNoRoute'
  });

  self.currentView = ko.observable("");
  self.activeCompanyId = ko.observable();
  self.activeCompany = ko.observable();
  self.activeCompanyName = ko.observable(i18n.t('app.navBar.noCompanyName'));
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
      return i18n.t("app.gettingStarted.companiesText", {count: self.numCompanies()});
    } else {
      return i18n.t("app.gettingStarted.noCompaniesText");
    }
  }, self);

  self.customersTextTrans = ko.pureComputed(function() {
    if (self.numCustomers() > 0) {
      return i18n.t("app.gettingStarted.customersText", {count: self.numCustomers()});
    } else {
      return i18n.t("app.gettingStarted.noCustomersText");
    }
  }, self);

  self.invoicesTextTrans = ko.pureComputed(function() {
    if (self.numInvoices() > 0) {
      return i18n.t("app.gettingStarted.invoicesText", {count: self.numInvoices()});
    } else {
      return i18n.t("app.gettingStarted.noInvoicesText");
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
    self.populate();
    self.currentView.subscribe(function(newValue) {
      if (newValue == 'home') {
        Log.info("GettingStartedViewModel - activated");
        self.populate();
      }
    });

    self.activeCompanyId.subscribe(function(newValue) {
      Log.info("GettingStartedViewModel - activeCompanyId.subscribe: value="
          + newValue);
      if (self.currentView() == 'home') {
        self.populate(true);
      } else {
        cache.del(Cache.CURR_USER_STATS());
      }
    });
  };

  self.populate = function(force) {
    force = typeof force !== 'undefined' ? force : false;
    // Do nothing if object exists in cache
    if (force || !cache.get(Cache.CURR_USER_STATS())) {
      Notify_showSpinner(true);
      $.getJSON(
          "/api/stats/" + self.activeCompanyId(),
          function(stats) {
            Log.info("Got stats id=" + self.activeCompanyId() + ", stats=" + JSON.stringify(stats));
            cache.set(Cache.CURR_USER_STATS(), stats);
            Notify_showSpinner(false);
          }).fail(function() {
            Log.info("GettingStartedViewModel - populate - failed");
            Notify_showSpinner(false);
          });
    } else {
      Log.info("GettingStartedViewModel - populate - data is cached!");
    }
  };
};

var setupKo = function() {
  ko.bindingHandlers.i18n = {
      update: function (element, valueAccessor, allBindings) {
          var key = ko.unwrap(valueAccessor()),
              options = ko.toJS(allBindings.get('i18n-options') || {}),
              translation,
              parts,
              attr;

          // Check whether we are dealing with attributes
          if (key.indexOf('[') === 0) {
              parts = key.split(']');
              key = parts[1];
              attr = parts[0].substr(1, parts[0].length - 1);
          }

          translation = i18n.t(key, options);

          if (attr === undefined) {
              // Check whether the translation contains markup
              if (translation.match(/<(\w+)((?:\s+\w+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/)) {
                  //noinspection InnerHTMLJS
                  element.innerHTML = translation;
              } else {
                  // Check whether the translation contains HTML entities
                  if (translation.match(/&(?:[a-z]+|#x?\d+);/gi)) {
                      //noinspection InnerHTMLJS
                      element.innerHTML = translation;
                  } else {
                      // Treat translation as plain text
                      element.innerText = translation;
                  }
              }
          } else {
              // Add translation to given attribute
              element.setAttribute(attr, translation);
          }
      }
  };
  
  var navViewModel = new NavViewModel();
  var settings = new SettingsDataModel();
  var companyViewModel = new CompanyListViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId, navViewModel.activeCompany, navViewModel.companyList);
  var settingsViewModel = new SettingsViewModel(navViewModel.currentView,
      settings, navViewModel.activeCompanyId, companyViewModel.setActiveCompanyId);
  var gettingStartedViewModel = new GettingStartedViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId);

  settingsViewModel.populate(function() {
    companyViewModel.populate();
    gettingStartedViewModel.enable();
  });
  
  var companyNewViewModel = new CompanyNewViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId, navViewModel.activeCompany);
  var customerListViewModel = new CustomerListViewModel(
      navViewModel.currentView, navViewModel.activeCompanyId);
  var customerNewViewModel = new CustomerNewViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId);
  var invoiceListViewModel = new InvoiceListViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId);
  var invoiceNewViewModel = new InvoiceNewViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId, navViewModel.activeCompany);
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

  ko.applyBindings(invoiceItemGroupTemplatesViewModel, document.getElementById("app-invoice_item_group_templates"));

  ko.applyBindings(settingsViewModel, document.getElementById("app-settings"));

  if (cfg.isAdmin) {
    var debugViewModel = new DebugViewModel(navViewModel.currentView);
    var userListViewModel = new UserListViewModel(navViewModel.currentView);
    var inviteListViewModel = new InviteListViewModel(navViewModel.currentView);
    ko.applyBindings(debugViewModel, document.getElementById("app-debug"));
    ko.applyBindings(userListViewModel, document.getElementById("app-users"));
    ko.applyBindings(inviteListViewModel, document.getElementById("app-invites"));
  }
  
  Notify_showSpinner(false);
};

$(function() {
  Log.info("init - load translations");
  $.i18n.init({
    //lng: 'en-US',
    useLocalStorage: false,
    supportedLngs: ['en', 'sv'],
    resGetPath: "locales/resources.json?lng=__lng__&ns=__ns__",
    sendMissing: true,
    dynamicLoad: true,
    debug: true
    }, function() {
    Log.info("init - load translations - done");
    Log.info("init - setupKo");
    setupKo();
    Log.info("init - setupKo - done");
  });  
});
