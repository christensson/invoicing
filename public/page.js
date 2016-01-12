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
        console.log("Property " + prop + " = " + data[prop]);
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
      console.log("page.js - SettingsViewModel - activated");
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
            console.log("page.js - SettingsViewModel - Active company change detected: ID="
                  + newValue);
            self.settings.setActiveCompanyId(newValue);
            self.saveSettings();
          });
          Notify_showSpinner(false);
          isPopulatedCb();
        }).fail(function() {
          console.log("page.js - SettingsViewModel - populate - failed");
          Notify_showSpinner(false);
          Notify_showMsg('error', i18n.t("app.settings.getNok"));
        });
  };
  
  self.saveSettings = function() {
    var ajaxData = self.settings.getJson();
    var ajaxUrl = "/api/settings";
    console.log("saveSettings: AJAX PUT (url=" + ajaxUrl + "): JSON="
        + JSON.stringify(ajaxData));
    Notify_showSpinner(true, i18n.t("app.settings.saveTicker"));
    return $.ajax({
      url : ajaxUrl,
      type : "PUT",
      contentType : "application/json",
      data : JSON.stringify(ajaxData),
      dataType : "json",
      success : function(data) {
        console.log("saveSettings: response: " + JSON.stringify(data));
        Notify_showSpinner(false);
        Notify_showMsg('success', i18n.t("app.settings.saveOk"));
      },
    });
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
        console.log("updateServer: response: " + JSON.stringify(data));
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
          onCompletion(data.company);
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
      console.log("page.js - CompanyListViewModel - activated");
      self.populate();
    }
  });

  self.activeCompanyId = activeCompanyId;
  self.activeCompany = activeCompany;
  self.companyList = companyList;

  self.populate = function() {
    Notify_showSpinner(true);
    $.getJSON(
        "/api/companies",
        function(allData) {
          console.log("CompanyListViewModel - populate: Got " + allData.length
              + " companies");
          var mappedCompanies = $.map(allData, function(item) {
            var company = new CompanyViewModel();
            company.setData(item);
            return company;
          });
          self.companyList(mappedCompanies);
          Notify_showSpinner(false);
        }).fail(function() {
      console.log("page.js - CompanyListViewModel - populate - failed");
      Notify_showSpinner(false);
      Notify_showMsg('error', i18n.t("app.customerList.getNok"));
    });
  };

  self.activateCompany = function(c) {
    console.log("Activate company: name=" + c.name() + ", _id=" + c._id());
    self.activeCompanyId(c._id());
  };

  self.setActiveCompanyId = function(id) {
    console.log("CompanyListViewModel - setActiveCompanyId: new id=" + id);
    self.activeCompanyId(id);
  };

  self.activeCompanyId.subscribe(function(newValue) {
    console.log("CompanyListViewModel - activeCompanyId.subscribe: value="
        + newValue);
    self.updateActiveCompany(newValue, self.companyList());
  });

  self.companyList.subscribe(function(changes) {
    console.log("CompanyListViewModel - companyList.subscribe changes="
        + JSON.stringify(changes));
    self.updateActiveCompany(self.activeCompanyId(), changes);
  });

  self.updateActiveCompany = function(id, companyList) {
    console
        .log("CompanyListViewModel - updateActiveCompany: companyList.length="
            + companyList.length + ", id=" + id);
    for ( var i = 0; i < companyList.length; i++) {
      var c = companyList[i];
      console.log("CompanyListViewModel - updateActiveCompany: i=" + i
          + ", name=" + c.name() + ", id=" + c._id());
      if (c._id() == id) {
        console.log("CompanyListViewModel - updateActiveCompany: found "
            + name + " for id=" + id);
        self.activeCompany(c);
        break;
      };
    };
  };
};

var CompanyNewViewModel = function(currentView, activeCompanyId, activeCompany, onCompanyChange) {
  var self = this;

  self.data = new CompanyViewModel();
  self.companyLogoInput = ko.observable();

  self.currentView = currentView;
  self.activeCompanyId = activeCompanyId;
  self.activeCompany = activeCompany;
  self.onCompanyChange = onCompanyChange;
  
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
      console.log("page.js - CompanyNewViewModel - activated");
      self.companyLogoInput("");
      document.getElementById("companyLogoImg").src = "";
      self.data.init();
    } else if (viewArray[0] == 'company_show' && viewArray.length > 1) {
      var _id = viewArray[1];
      self.companyLogoInput("");
      console.log("page.js - CompanyNewViewModel - activated - show #" + _id);
      self.getCompany(_id);
    }
  });
  
  self.getCompany = function(_id) {
    Notify_showSpinner(true);
    $.getJSON(
        "/api/company/" + _id,
        function(company) {
          console.log("Got company id=" + _id + ", data=" + JSON.stringify(company));
          self.data.setData(company);
          Notify_showSpinner(false);
        }).fail(function() {
          console.log("page.js - CompanyNewViewModel - getCompany - failed");
          Notify_showSpinner(false);
          Notify_showMsg('error', i18n.t("app.company.getNok"));
        });
  };
  
  self.saveCompany = function() {
    self.data.updateServer(function(c) {
      console.log("page.js - CompanyNewViewModel - saveCompany onCompletion: " + JSON.stringify(c) + ", activeId=" + self.activeCompanyId());
      var prevActiveCompanyId = self.activeCompanyId();
      if (prevActiveCompanyId == null) {
        console.log("page.js - CompanyNewViewModel - No previosly active company, setting to new one - id=" + c._id);
        self.activeCompanyId(c._id);
      } else if (c._id == self.activeCompanyId()) {
        console.log("page.js - CompanyNewViewModel - active company updated - id=" + self.activeCompanyId());
        // c.name in this case is not a function. Fix done in activeCompany.subscribe()
        self.activeCompany(c);
      }
      self.onCompanyChange();
    });
  };
  
  self.uploadLogo = function(formElement) {
    var _id = self.data._id();
    console.log("page.js - CompanyNewViewModel - uploadLogo: companyId=" + _id + ", logo=" + formElement.elements.logo.value);
    console.log("form data: " + JSON.stringify(formElement));
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
      console.log("updateServer: Nothing to do (invalid entry without _id)");
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
        console.log("updateServer: response: " + JSON.stringify(data));
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
      console.log("page.js - CustomerListViewModel - activated");
      self.populate();
    }
  });

  // Customer part
  self.customerList = ko.observableArray();

  self.populate = function() {
    var companyId = self.activeCompanyId();
    if (companyId != null) {
      Notify_showSpinner(true);
      $.getJSON("/api/customers/" + companyId, function(allData) {
        var mappedCustomers = $.map(allData, function(item) {
          var customer = new CustomerViewModel();
          customer.setData(item);
          return customer;
        });
        self.customerList(mappedCustomers);
        Notify_showSpinner(false);
      }).fail(function() {
        console.log("page.js - CustomerListViewModel - populate - failed");
        Notify_showSpinner(false);
        Notify_showMsg('error', i18n.t("app.customerList.getNok"));
      });
    } else {
      Notify_showMsg('info', i18n.t("app.customerList.getNok", {context: "noCompany"}));
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
      console.log("page.js - CustomerNewViewModel - activated");
      self.data.init();
      self.data.setActiveCompanyId(self.activeCompanyId());
    } else if (viewArray[0] == 'customer_show' && viewArray.length > 1) {
      var _id = viewArray[1];
      console.log("page.js - CustomerNewViewModel - activated - show #" + _id);
      self.getCustomer(_id);
    }
  });
  
  self.getCustomer = function(_id) {
    Notify_showSpinner(true);
    $.getJSON(
        "/api/customer/" + _id,
        function(customer) {
          console.log("Got customer id=" + _id + ", data=" + JSON.stringify(customer));
          self.data.setData(customer);
          Notify_showSpinner(false);
        }).fail(function() {
          console.log("page.js - CustomerNewViewModel - getCustomer - failed");
          Notify_showSpinner(false);
          Notify_showMsg('error', i18n.t("app.customer.getNok"));
        });
  };
  
  self.saveCustomer = function() {
    self.data.updateServer();
  };
};

// Trick for doing classmethods...
function InvoiceOps(){};
InvoiceOps.printInvoice = function(id) {
  console.log("page.js - printInvoice - id=" + id);
  if (id !== undefined) {
    Notify_showSpinner(true);
    try {
      var child = window.open("/api/invoiceReport/" + id);
      $(child).ready(function() {
        console.log("page.js - printInvoice - Report done!");
        Notify_showSpinner(false);
      });
      child.focus();
    } catch (e) {
      console.log("page.js - printInvoice - Failed!");
      Notify_showSpinner(false);
    }
  } else {
    console.log("page.js - printInvoice - failure, undefined id");
  }
};

var InvoiceItemViewModel = function(data, currency) {
  var self = this;
  self.activeCurrency = currency;

  self.description = ko.observable(data.description);
  self.price = ko.observable(data.price);
  self.count = ko.observable(data.count);
  self.vat = ko.observable(data.vat);
  self.discount = ko.observable(data.discount);
  self.isValid = ko.observable(data.isValid);
  self.total = ko.pureComputed(function() {
    var total = parseFloat(this.count()) * parseFloat(this.price())
        * (1.0 - (parseFloat(this.discount()) / 100.0));
    return total;
  }, self);

  self.totalStr = ko.pureComputed(function() {
    return Util.formatCurrency(self.total(), self.activeCurrency());
  }, self);

  self.getJson = function() {
    var res = {
      description : self.description(),
      price : self.price(),
      count : self.count(),
      vat : self.vat(),
      discount : self.discount(),
      total : self.total(),
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
    self.invoiceItems.removeAll();
    for ( var i = 0; i < newData.invoiceItems.length; i++) {
      if (newData.invoiceItems[i].isValid) {
        console.log("Push item i=" + i + " desc=" + newData.invoiceItems[i].description);
        self.invoiceItems.push(new InvoiceItemViewModel(newData.invoiceItems[i], self.currency));
      } else {
        console.log("Skip invalid item i=" + i + " desc=" + newData.invoiceItems[i].description);
      }
    }
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
      invoiceItems : []
    };
    self.setData(data);
  };

  self.init();

  self.numInvoiceItems = ko.pureComputed(function() {
    var sum = 0;
    for ( var i = 0; i < this.invoiceItems().length; i++) {
      if (this.invoiceItems()[i].isValid()) {
        sum += 1;
      }
    }
    return sum;
  }, this);

  self.totalExclVat = ko.pureComputed(function() {
    var sum = 0;
    for ( var i = 0; i < this.invoiceItems().length; i++) {
      if (this.invoiceItems()[i].isValid()) {
        sum += this.invoiceItems()[i].total();
      }
    }
    if (self.isCredit()) {
      sum = -sum;
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
    if (self.isCredit()) {
      sum = -sum;
    }
    return sum;
  }, this);
  
  self.totalExclVatStr = ko.pureComputed(function() {
    return Util.formatCurrency(self.totalExclVat(), self.currency());
  }, self);

  self.totalInclVatStr = ko.pureComputed(function() {
    return Util.formatCurrency(self.totalInclVat(), self.currency());
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

  self.newInvoiceItem = function() {
    var data = {
      description : "",
      price : 0.0,
      count : 1.0,
      vat : 25,
      discount : 0.0,
      isValid : true
    };
    self.invoiceItems.push(new InvoiceItemViewModel(data, self.currency));
    console.log("Added new invoice item. #items=" + self.invoiceItems().length + ", data=" + JSON.stringify(data));
  };

  self.deleteInvoiceItem = function(item) {
    item.isValid(false);
    self.invoiceItems.destroy(item);
  };

  self.getJson = function() {
    var items = [];
    for ( var i = 0; i < self.invoiceItems().length; i++) {
      items.push(self.invoiceItems()[i].getJson());
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
      invoiceItems : items,
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
    return Util.formatCurrency(self.totalExclVat(), self.currency());
  }, self);
  self.totalInclVatStr = ko.pureComputed(function() {
    return Util.formatCurrency(self.totalInclVat(), self.currency());
  }, self);
  self.isOverdue = ko.pureComputed(function() {
    var overdue = false;
    if (self.daysUntilPayment() !== undefined && parseInt(self.daysUntilPayment()) >= 0)
    {
      var invoiceDate = new Date(self.date());
      var invoiceAgeMs = Date.now() - invoiceDate.valueOf();
      var invoiceAgeDays = invoiceAgeMs / (1000 * 3600 * 24);
      console.log("Invoice isOverdue: iid=" + self.iid() + ", date="
          + invoiceDate + ", ageInDays=" + invoiceAgeDays + ", daysUntilPayment="
          + self.daysUntilPayment());
      if (invoiceAgeDays > parseInt(self.daysUntilPayment())) {
        console.log("Invoice " + self.iid() + " is overdue!");
        overdue = true;
      }
    }
    else
    {
      console.log("Invoice isOverdue: iid=" + self.iid() + ", not valid daysUntilPayment="
          + self.daysUntilPayment());
    }
    return overdue;
  });

  self.printInvoice = function() {
    console.log("page.js - InvoiceListDataViewModel - Report requested");
    if (self._id() !== undefined) {
      InvoiceOps.printInvoice(self._id());
    } else {
      Notify_showMsg('error', i18n.t("app.invoiceList.printNok", {context: "noId"}));
      console.log("page.js - InvoiceListDataViewModel - Invoice has no id.");
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
      console.log("page.js - InvoiceListViewModel - activated");
      self.populate();
    }
  });

  // Invoice part
  self.invoiceList = ko.observableArray();

  self.populate = function() {
    var companyId = self.activeCompanyId();
    if (companyId != null) {
      Notify_showSpinner(true);
      $.getJSON("/api/invoices/" + companyId, function(allData) {
        var mappedInvoices = $.map(allData, function(item) {
          return new InvoiceListDataViewModel(item);
        });
        self.invoiceList(mappedInvoices);
        Notify_showSpinner(false);
      }).fail(function() {
        console.log("page.js - InvoiceListViewModel - populate - failed");
        Notify_showSpinner(false);
        Notify_showMsg('error', i18n.t("app.invoiceList.getNok"));
      });
    } else {
      Notify_showMsg('info', i18n.t("app.invoiceList.getNok", {context: "noCompany"}));
    }
  };
  
  self.doToggleShowPaid = function() {
    self.showPaid(!self.showPaid());
    console.log("page.js - InvoiceListViewModel - showPaid=" + self.showPaid()
        + " (new state)");
  };
  
  self.doToggleShowCredit = function() {
    self.showCredit(!self.showCredit());
    console.log("page.js - InvoiceListViewModel - showCredit=" + self.showCredit()
        + " (new state)");
  };

  self.doToggleShowCanceled = function() {
    self.showCanceled(!self.showCanceled());
    console.log("page.js - InvoiceListViewModel - showCanceled=" + self.showCanceled()
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
    console.log("page.js - InvoiceListViewModel - invoiceListSort.subscribe=" + JSON.stringify(newVal));
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
;
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
  self.numServerReqLeft = 0;

  self.currentView.subscribe(function(newValue) {
    self.data.init();
    self.selectedCustomer(undefined);
    var viewArray = newValue.split("/");
    if (viewArray[0] == 'invoice_new') {
      console.log("page.js - InvoiceNewViewModel - activated");
      self.data.init(self.activeCompany().defaultNumDaysUntilPayment());
      self.data.newInvoiceItem();
      self.data.setCompanyId(self.activeCompanyId());
      self.numServerReqLeft = 1;
      self.populate();
    } else if (viewArray[0] == 'invoice_show' && viewArray.length > 1) {
      var _id = viewArray[1];
      console.log("page.js - InvoiceNewViewModel - activated - show #" + _id);
      self.numServerReqLeft = 2;
      self.getInvoice(_id);
      self.populate();
    }
  });
  
  self.selectedCustomer.subscribe(function(newValue) {
    if (newValue !== undefined && newValue.data !== undefined) {
      console.log("page.js - InvoiceNewViewModel - Customer selected - "
          + JSON.stringify(newValue.data));
      self.data.setCustomer(newValue.data);
    }
  });

  self.selectedCurrency.subscribe(function(newValue) {
    if (newValue !== undefined) {
      console.log("page.js - InvoiceNewViewModel - Currency selected - "
          + newValue);
      self.data.setCurrency(newValue);
    }
  });

  self.populate = function() {
    var companyId = self.activeCompanyId();
    if (companyId != null) {
      Notify_showSpinner(true);
      self.customerList.removeAll();
      $.getJSON("/api/customers/" + companyId, function(allData) {
        for (var i = 0; i < allData.length; i++) {
          self.customerList.push(new InvoiceCustomerModel(allData[i]));
        }
        self.numServerReqLeft--;
        self.syncCustomerIdInput();
        Notify_showSpinner(false);
      }).fail(function() {
        console.log("page.js - InvoiceNewViewModel - populate - failed");
        self.numServerReqLeft--;
        Notify_showSpinner(false);
        Notify_showMsg('error', i18n.t("app.invoice.getCustomersNok"));
      });
    } else {
      Notify_showMsg('info', i18n.t("app.invoice.getCustomersNok", {context: "noCompany"}));
    }
  };

  self.getInvoice = function(_id) {
    Notify_showSpinner(true);
    $.getJSON(
        "/api/invoice/" + _id,
        function(invoice) {
          console.log("Got invoice id=" + _id + ", data=" + JSON.stringify(invoice));
          self.data.setData(invoice);
          self.selectedCustomer(self.data.customer());
          self.selectedCurrency(self.data.currency());
          self.numServerReqLeft--;
          self.syncCustomerIdInput();
          Notify_showSpinner(false);
        }).fail(function() {
          console.log("page.js - InvoiceNewViewModel - getInvoice - failed");
          self.numServerReqLeft--;
          Notify_showSpinner(false);
          Notify_showMsg('error', i18n.t("app.invoice.getNok"));
        });
  };
  
  self.syncCustomerIdInput = function() {
    if (self.numServerReqLeft === 0) {
      console.log("page.js - InvoiceNewViewModel - syncCustomerIdInput");
      var cid = self.data.customer().cid;
      if (cid !== undefined) {
        for (var i = 0; i < self.customerList().length; i++) {
          if (cid === self.customerList()[i].data.cid) {
            console.log("page.js - InvoiceNewViewModel - syncCustomerIdInput: cid=" + cid + " found");
            self.selectedCustomer(self.customerList()[i]);
            break;
          }
        }
      } else {
        console.log("page.js - InvoiceNewViewModel - syncCustomerIdInput: customer.cid is undefined");        
      }
    }
  };

  self.saveInvoice = function() {
    if ((self.data._id() === undefined) && !self.data.isValid()) {
      Notify_showMsg('error', i18n.t("app.invoice.saveNok"));
      console.log("saveInvoice: Nothing to do (invalid entry without _id)");
      return;
    } else if (self.data.customer()._id === undefined) {
      Notify_showMsg('error', i18n.t("app.invoice.saveNok", {context: 'invalidCustomer'}));
      console.log("No customer selected: " + JSON.stringify(self.data.customer()));
      return;
    } else if (self.data.date() === undefined) {
      Notify_showMsg('error', i18n.t("app.invoice.saveNok", {context: 'invalidDate'}));
      return;
    }
    var isNewInvoice = (self.data._id() == undefined) ? true : false;
    var ajaxData = JSON.stringify(self.data.getJson());
    var ajaxUrl = "/api/invoice/" + self.data._id();
    console.log("saveInvoice: AJAX PUT (url=" + ajaxUrl + "): JSON="
        + ajaxData);
    Notify_showSpinner(true, i18n.t("app.invoice.saveTicker"));
    return $.ajax({
      url : ajaxUrl,
      type : "PUT",
      contentType : "application/json",
      data : ajaxData,
      dataType : "json",
      success : function(data) {
        console.log("saveInvoice: response: " + JSON.stringify(data));
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
      },
    });
  };
  
  self.doInvoicePrint = function() {
    console.log("page.js - InvoiceNewViewModel - Print requested");
    if (self.data._id() !== undefined) {
      InvoiceOps.printInvoice(self.data._id());
    } else {
      Notify_showMsg('info', i18n.t("app.invoice.printNok", {context: 'noId'}));
      console.log("page.js - InvoiceNewViewModel - Invoice not saved.");
    }
  };
  
  self.doCopyInvoice = function() {
    console.log("page.js - InvoiceNewViewModel - Copy invoice requested");
    /* Mark datafields so that the next save will allocate new invoice ids */
    self.data.forceMarkAsNew();
  };

  self.newItem = function() {
    self.data.newInvoiceItem();
  };

  self.deleteItem = function(item) {
    console.log("page.js - InvoiceNewViewModel - delete: "
        + JSON.stringify(item));
    self.data.deleteInvoiceItem(item);
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
      console.log("page.js - DebugViewModel - activated");
    }
  });

  self.spinnerVisible.subscribe(function(showSpinner) {
    console.log("page.js - DebugViewModel - showSpinner: " + showSpinner);
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
  };
  
  self.toggleDetailedInfo = function(user) {
    var newIsDetailsVisible = !self.isDetailsVisible();
    console.log("page.js - UserViewModel - toggleDetailedInfo: visible=" + newIsDetailsVisible + " (new value)");
    
    if (newIsDetailsVisible) {
      Notify_showSpinner(true);
      $.getJSON(
          "/api/userStats/" + self._id(),
          function(stats) {
            console.log("Got stats for uid=" + self._id() + ", stats=" + JSON.stringify(stats));
            self.totalStats(stats.total);
            Notify_showSpinner(false);
            self.isDetailsVisible(newIsDetailsVisible);
          }).fail(function() {
            console.log("page.js - UserViewModel - toggleDetailedInfo - failed");
            Notify_showSpinner(false);
          });      
    } else {
      self.isDetailsVisible(false);
    }    
  };
};

var UserListViewModel = function(currentView) {
  var self = this;

  self.currentView = currentView;

  self.currentView.subscribe(function(newValue) {
    if (newValue == 'users') {
      console.log("page.js - UserListViewModel - activated");
      self.populate();
    }
  });

  self.userList = ko.observableArray();

  self.populate = function() {
    Notify_showSpinner(true);
    $.getJSON("/api/users", function(allData) {
      console.log("Got users: " + JSON.stringify(allData));
      var mappedUsers = $.map(allData, function(item) {
        var user = new UserViewModel();
        user.setData(item);
        return user;
      });
      self.userList(mappedUsers);
      Notify_showSpinner(false);
    }).fail(function() {
      console.log("page.js - UserListViewModel - populate - failed");
      Notify_showSpinner(false);
      Notify_showMsg('error', i18n.t("app.userList.getNok"));
    });
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
      console.log("page.js - InviteListViewModel - activated");
      self.populate();
    }
  });

  self.inviteList = ko.observableArray();

  self.populate = function() {
    Notify_showSpinner(true);
    $.getJSON("/api/invites", function(allData) {
      console.log("Got invites: " + JSON.stringify(allData));
      var mappedInvites = $.map(allData, function(item) {
        var invite = new InviteViewModel();
        invite.setData(item);
        return invite;
      });
      self.inviteList(mappedInvites);
      Notify_showSpinner(false);
    }).fail(function() {
      console.log("page.js - InviteListViewModel - populate - failed");
      Notify_showSpinner(false);
      Notify_showMsg('error', i18n.t("app.inviteList.getNok"));
    });
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
    icon : 'glyphicon glyphicon-list',
    location : 'main'
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
      console.log("Active company change detected: new=" + JSON.stringify(c) + ", c.name type is " + typeof c.name);
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
    console.log("page.js - navigation - selectCompany: " + JSON.stringify(company));
    self.activeCompanyId(company._id());
    
    // Work-around: Navigate to home instead of making sure that all views updates when company is changed
    location.hash = '/page/home';
  };

  self.routes = {
    '/page/:view' : function(view) {
      self.currentView(view);
      console.log("page.js - navigation - view: " + view);
    },
    '/page/:view/:param' : function(view, param) {
      self.currentView(view + "/" + param);
      console.log("page.js - navigation - view: " + view + ", param=" + param);
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

  self.enable = function() {
    self.populate();
    self.currentView.subscribe(function(newValue) {
      if (newValue == 'home') {
        console.log("page.js - GettingStartedViewModel - activated");
        self.populate();
      }
    });

    self.activeCompanyId.subscribe(function(newValue) {
      console.log("GettingStartedViewModel - activeCompanyId.subscribe: value="
          + newValue);
      if (self.currentView() == 'home') {
        self.populate();
      }
    });
  };

  self.populate = function() {
    Notify_showSpinner(true);
    $.getJSON(
        "/api/stats/" + self.activeCompanyId(),
        function(stats) {
          console.log("Got stats id=" + self.activeCompanyId() + ", stats=" + JSON.stringify(stats));
          self.stats(stats);
          Notify_showSpinner(false);
        }).fail(function() {
          console.log("page.js - GettingStartedViewModel - populate - failed");
          Notify_showSpinner(false);
        });
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
      navViewModel.activeCompanyId, navViewModel.activeCompany, companyViewModel.populate);
  var customerListViewModel = new CustomerListViewModel(
      navViewModel.currentView, navViewModel.activeCompanyId);
  var customerNewViewModel = new CustomerNewViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId);
  var invoiceListViewModel = new InvoiceListViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId);
  var invoiceNewViewModel = new InvoiceNewViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId, navViewModel.activeCompany);

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
  console.log("page.js - init - load translations");
  $.i18n.init({
    //lng: 'en-US',
    useLocalStorage: false,
    supportedLngs: ['en', 'sv'],
    resGetPath: "locales/resources.json?lng=__lng__&ns=__ns__",
    sendMissing: true,
    dynamicLoad: true,
    debug: true
    }, function() {
    console.log("page.js - init - load translations - done");
    console.log("page.js - init - setupKo");
    setupKo();
    console.log("page.js - init - setupKo - done");
  });  
});
