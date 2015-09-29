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
  self.payment1 = ko.observable();
  self.payment2 = ko.observable();
  self.payment1Caption = ko.observable();
  self.payment2Caption = ko.observable();
  self.isValid = ko.observable();
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
    self.payment1(data.payment1);
    self.payment2(data.payment2);
    self.payment1Caption(data.payment1Caption);
    self.payment2Caption(data.payment2Caption);
    self.isValid(data.isValid);
  };
  
  self.init = function() {
    var data = {
        _id : undefined,
        uid : undefined,
        name : "",
        addr1 : "",
        addr2 : "",
        addr3 : "",
        contact1Caption : "",
        contact2Caption : "",
        contact3Caption : "",
        contact1 : "",
        contact2 : "",
        contact3 : "",
        payment1Caption : "",
        payment2Caption : "",
        payment1 : "",
        payment2 : "",
        isValid : true
      };
    self.setData(data);
  };
  
  self.init();

  self.updateServer = function(onCompletion) {
    if ((self._id() == undefined) && !self.isValid()) {
      console.log("updateServer: Nothing to do (invalid entry without _id)");
      return;
    } else if (self.name().length == 0) {
      Notify_showMsg('error',
          'Company <strong>name</strong> must be specified!');
      self.nameError(true);
      return;
    }
    self.nameError(false);
    var isNew = (self._id() == undefined) ? true : false;
    return $.ajax({
      url : "/api/company/" + self._id(),
      type : "PUT",
      contentType : "application/json",
      data : JSON.stringify(self.toJSON()),
      dataType : "json",
      success : function(data) {
        console.log("updateServer: response: " + JSON.stringify(data));
        var opStr = "added";
        if (!isNew) {
          opStr = (data.company.isValid) ? 'updated' : 'deleted';
        }
        Notify_showMsg('success', 'Company <strong>' + data.company.name
            + '</strong> ' + opStr + '.');
        self.uid(data.company.uid);
        self._id(data.company._id);
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
      payment1 : self.payment1(),
      payment2 : self.payment2(),
      isValid : self.isValid()
    };
    return res;
  };
};

var CompanyListViewModel = function(currentView, activeCompanyId, activeCompanyName, companyList) {
  var self = this;

  self.currentView = currentView;

  self.currentView.subscribe(function(newValue) {
    if (newValue == 'companies') {
      console.log("page.js - CompanyListViewModel - activated");
      self.populate();
    }
  });

  self.activeCompanyId = activeCompanyId;
  self.activeCompanyName = activeCompanyName;
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
      Notify_showMsg('error', 'Failed to get companies!');
    });
  };

  self.newCompany = function() {
    self.companyList.push(new CompanyViewModel());
  };

  self.deleteCompany = function(c) {
    console.log("Delete: " + JSON.stringify(c));
    c.isValid(false);
    self.companyList.destroy(c);
  };

  self.activateCompany = function(c) {
    console.log("Activate company: name=" + c.name() + ", _id=" + c._id());
    self.activeCompanyId(c._id());
    self.activeCompanyName(c.name());
  };

  self.setActiveCompanyId = function(id) {
    console.log("CompanyListViewModel - setActiveCompanyId: new id=" + id);
    self.activeCompanyId(id);
  };

  self.activeCompanyId.subscribe(function(newValue) {
    console.log("CompanyListViewModel - activeCompanyId.subscribe: value="
        + newValue);
    self.updateActiveCompanyName(newValue, self.companyList());
  });

  self.companyList.subscribe(function(changes) {
    console.log("CompanyListViewModel - companyList.subscribe changes="
        + JSON.stringify(changes));
    self.updateActiveCompanyName(self.activeCompanyId(), changes);
  });

  self.updateActiveCompanyName = function(id, companyList) {
    console
        .log("CompanyListViewModel - updateActiveCompanyName: companyList.length="
            + companyList.length + ", id=" + id);
    for ( var i = 0; i < companyList.length; i++) {
      var name = companyList[i].name();
      console.log("CompanyListViewModel - updateActiveCompanyName: i=" + i
          + ", name=" + name + ", id=" + companyList[i]._id());
      if (companyList[i]._id() == id) {
        console.log("CompanyListViewModel - updateActiveCompanyName: found "
            + name + " for id=" + id);
        self.activeCompanyName(name);
        break;
      }
    }
  };
};

var CompanyNewViewModel = function(currentView, activeCompanyId, activeCompanyName) {
  var self = this;

  self.data = new CompanyViewModel();

  self.currentView = currentView;
  self.activeCompanyId = activeCompanyId;
  self.activeCompanyName = activeCompanyName;

  self.currentView.subscribe(function(newValue) {
    self.data.init();
    var viewArray = newValue.split("/");
    if (viewArray[0] == 'company_new') {
      console.log("page.js - CompanyNewViewModel - activated");
      self.data.init();
    } else if (viewArray[0] == 'company_show' && viewArray.length > 1) {
      var _id = viewArray[1];
      console.log("page.js - CompanyNewViewModel - activated - show #" + _id);
      self.getCompany(_id);
    }
  });
  
  self.getCompany = function(_id) {
    Notify_showSpinner(true);
    $.getJSON(
        "/api/company/" + _id,
        function(company) {
          console
          .log("Got company id=" + _id + ", data=" + JSON.stringify(company));
          self.data.setData(company);
          Notify_showSpinner(false);
        }).fail(function() {
          console.log("page.js - CompanyNewViewModel - getCompany - failed");
          Notify_showSpinner(false);
          Notify_showMsg('error', 'Failed to get company!');
        });
  };
  
  self.saveCompany = function() {
    self.data.updateServer(function(c) {
      console.log("page.js - CompanyNewViewModel - saveCompany onCompletion: " + JSON.stringify(c) + ", activeId=" + self.activeCompanyId());
      if (c._id == self.activeCompanyId()) {
        console.log("page.js - CompanyNewViewModel - active company updated - id=" + self.activeCompanyId());
        self.activeCompanyName(c.name);
      }
    });
  };
};

var CustomerViewModel = function(data) {
  var self = this;

  self._id = ko.observable(data._id);
  self.cid = ko.observable(data.cid);
  self.uid = ko.observable(data.uid);
  self.name = ko.observable(data.name);
  self.addr1 = ko.observable(data.addr1);
  self.addr2 = ko.observable(data.addr2);
  self.phone = ko.observable(data.phone);
  self.isValid = ko.observable(data.isValid);
  self.companyId = ko.observable(data.companyId);
  self.nameError = ko.observable(false);
  self.hasErrorCss = ko.pureComputed(function() {
    // return this.nameError() ? "has-error" : "";
    return this.nameError() ? "highlighterror" : "";
  }, self);

  self.updateServer = function() {
    if ((self._id() == undefined) && !self.isValid()) {
      console.log("updateServer: Nothing to do (invalid entry without _id)");
      return;
    } else if (self.name().length == 0) {
      Notify_showMsg('error',
          'Customer <strong>name</strong> must be specified!');
      self.nameError(true);
      return;
    }
    self.nameError(false);
    var isNewCustomer = (self._id() == undefined) ? true : false;
    return $.ajax({
      url : "/api/customer/" + self._id(),
      type : "PUT",
      contentType : "application/json",
      data : JSON.stringify({
        _id : self._id(),
        cid : self.cid(),
        uid : self.uid(),
        companyId : self.companyId(),
        name : self.name(),
        addr1 : self.addr1(),
        addr2 : self.addr2(),
        phone : self.phone(),
        isValid : self.isValid()
      }),
      dataType : "json",
      success : function(data) {
        console.log("updateServer: response: " + JSON.stringify(data));
        var opStr = "added";
        if (!isNewCustomer) {
          opStr = (data.customer.isValid) ? 'updated' : 'deleted';
        }
        Notify_showMsg('success', 'Customer <strong>' + data.customer.name
            + '</strong> with customer id ' + data.customer.cid + ' ' + opStr
            + '.');
        self.cid(data.customer.cid);
        self.uid(data.customer.uid);
        self._id(data.customer._id);
        self.isValid(data.customer.isValid);
      },
    });
  };

  self.name.subscribe(this.updateServer);
  self.addr1.subscribe(this.updateServer);
  self.addr2.subscribe(this.updateServer);
  self.phone.subscribe(this.updateServer);
  self.isValid.subscribe(this.updateServer);
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
    Notify_showSpinner(true);
    $.getJSON("/api/customers/" + self.activeCompanyId(), function(allData) {
      var mappedCustomers = $.map(allData, function(item) {
        return new CustomerViewModel(item);
      });
      self.customerList(mappedCustomers);
      Notify_showSpinner(false);
    }).fail(function() {
      console.log("page.js - CustomerListViewModel - populate - failed");
      Notify_showSpinner(false);
      Notify_showMsg('error', 'Failed to get customers!');
    });
  };

  self.newCustomer = function() {
    var data = {
      _id : undefined,
      cid : undefined,
      uid : undefined,
      companyId : self.activeCompanyId(),
      name : "",
      addr1 : "",
      addr2 : "",
      phone : "",
      isValid : true
    };
    self.customerList.push(new CustomerViewModel(data));
  };

  self.deleteCustomer = function(c) {
    console.log("Delete: " + JSON.stringify(c));
    c.isValid(false);
    self.customerList.destroy(c);
  };

  self.doCustomersReport = function() {
    console.log("Report requested");
    Notify_showSpinner(true);
    try {
      var child = window.open("/api/customersReport");
      $(child).ready(function() {
        console.log("Report done!");
        Notify_showSpinner(false);
      });
      child.focus();
    } catch (e) {
    }
  };
};

var InvoiceItemViewModel = function(data) {
  var self = this;

  self.description = ko.observable(data.description);
  self.price = ko.observable(data.price);
  self.count = ko.observable(data.count);
  self.vat = ko.observable(data.vat);
  self.discount = ko.observable(data.discount);
  self.isValid = ko.observable(data.isValid);
  self.total = ko.pureComputed(function() {
    var total = parseFloat(this.count()) * parseFloat(this.price())
        * (1.0 - parseFloat(this.discount()));
    return total;
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
  self.isLocked = ko.observable();
  self.customer = ko.observable();
  self.yourRef = ko.observable();
  self.ourRef = ko.observable();
  self.date = ko.observable();
  self.daysUntilPayment = ko.observable();
  self.projId = ko.observable();
  self.invoiceItems = ko.observableArray();

  self.setData = function(newData) {
    self._id(newData._id);
    self.iid(newData.iid);
    self.uid(newData.uid);
    self.companyId(newData.companyId);
    self.company(newData.company);
    self.isValid(newData.isValid);
    self.isPaid(newData.isPaid);
    self.isLocked(newData.isLocked);
    self.customer(newData.customer);
    self.yourRef(newData.yourRef);
    self.ourRef(newData.ourRef);
    self.date(newData.date);
    self.daysUntilPayment(newData.daysUntilPayment);
    self.projId(newData.projId);
    self.invoiceItems.removeAll();
    for ( var i = 0; i < newData.invoiceItems.length; i++) {
      console.log("Push item i=" + i + " desc=" + newData.invoiceItems[i].description);
      self.invoiceItems.push(new InvoiceItemViewModel(newData.invoiceItems[i]));
    }
  };

  self.setCompanyId = function(companyId) {
    self.companyId(companyId);
  };

  self.init = function() {
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
      date : "",
      daysUntilPayment : "",
      projId : "",
      isLocked : false,
      isPaid : false,
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
    return sum;
  }, this);
  self.totalInclVat = ko.pureComputed(function() {
    var sum = 0;
    for ( var i = 0; i < this.invoiceItems().length; i++) {
      if (this.invoiceItems()[i].isValid()) {
        sum += this.invoiceItems()[i].total()
            * (1 + parseFloat(this.invoiceItems()[i].vat()));
      }
    }
    return sum;
  }, this);

  self.setCustomer = function(data) {
    self.customer(data);
  };

  self.newInvoiceItem = function() {
    var data = {
      description : "",
      price : 0.0,
      count : 1.0,
      vat : 0.25,
      discount : 0.0,
      isValid : true
    };
    self.invoiceItems.push(new InvoiceItemViewModel(data));
    console.log("Added new invoice item. #items=" + self.invoiceItems().length + ", data=" + JSON.stringify(data));
  };

  self.deleteInvoiceItem = function(item) {
    item.isValid(false);
    self.invoiceItems.destroy(item);
  };

  self.doToggleLocked = function() {
    self.isLocked(!self.isLocked());
    console.log("page.js - InvoiceDataViewModel - isLocked=" + self.isLocked()
        + " (new state)");
  };

  self.doTogglePaid = function() {
    self.isPaid(!self.isPaid());
    console.log("page.js - InvoiceDataViewModel - isPaid=" + self.isPaid()
        + " (new state)");
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
      isPaid : self.isPaid(),
      isValid : self.isValid(),
      customer : self.customer(),
      yourRef : self.yourRef(),
      ourRef : self.ourRef(),
      date : self.date(),
      daysUntilPayment : self.daysUntilPayment(),
      projId : self.projId(),
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
  self.isPaid = ko.observable(data.isPaid);
  self.isLocked = ko.observable(data.isLocked);
  self.customer = ko.observable(data.customer);
  self.yourRef = ko.observable(data.yourRef);
  self.ourRef = ko.observable(data.ourRef);
  self.date = ko.observable(data.date);
  self.daysUntilPayment = ko.observable(data.daysUntilPayment);
  self.projId = ko.observable(data.projId);
  self.totalExclVat = ko.observable(data.totalExclVat);
  self.totalInclVat = ko.observable(data.totalInclVat);
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
};

var InvoiceListViewModel = function(currentView, activeCompanyId) {
  var self = this;

  self.currentView = currentView;
  self.activeCompanyId = activeCompanyId;
  self.showPaid = ko.observable(true);
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
    Notify_showSpinner(true);
    $.getJSON("/api/invoices/" + self.activeCompanyId(), function(allData) {
      var mappedInvoices = $.map(allData, function(item) {
        return new InvoiceListDataViewModel(item);
      });
      self.invoiceList(mappedInvoices);
      Notify_showSpinner(false);
    }).fail(function() {
      console.log("page.js - InvoiceListViewModel - populate - failed");
      Notify_showSpinner(false);
      Notify_showMsg('error', 'Failed to get invoices!');
    });
  };
  
  self.doToggleShowPaid = function() {
    self.showPaid(!self.showPaid());
    console.log("page.js - InvoiceListViewModel - showPaid=" + self.showPaid()
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
  // Override toJSON method since typeahead reads the JSON for the suggestion
  // list
  /*
  self.toJSON = function() {
    return self.toString();
  };*/
};

var InvoiceNewViewModel = function(currentView, activeCompanyId) {
  var self = this;

  self.data = new InvoiceDataViewModel();

  self.currentView = currentView;
  self.activeCompanyId = activeCompanyId;
  self.customerList = ko.observableArray();
  self.selectedCustomer = ko.observable();
  self.numServerReqLeft = 0;

  self.currentView.subscribe(function(newValue) {
    self.data.init();
    self.selectedCustomer(undefined);
    var viewArray = newValue.split("/");
    if (viewArray[0] == 'invoice_new') {
      console.log("page.js - InvoiceNewViewModel - activated");
      self.data.init();
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

  self.populate = function() {
    Notify_showSpinner(true);
    self.customerList.removeAll();
    $.getJSON("/api/customers/" + self.activeCompanyId(), function(allData) {
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
      Notify_showMsg('error', 'Failed to get customers!');
    });
  };

  self.getInvoice = function(_id) {
    Notify_showSpinner(true);
    $.getJSON(
        "/api/invoice/" + _id,
        function(invoice) {
          console
          .log("Got invoice id=" + _id + ", data=" + JSON.stringify(invoice));
          self.data.setData(invoice);
          self.selectedCustomer(self.data.customer());
          self.numServerReqLeft--;
          self.syncCustomerIdInput();
          Notify_showSpinner(false);
        }).fail(function() {
          console.log("page.js - InvoiceNewViewModel - getInvoice - failed");
          self.numServerReqLeft--;
          Notify_showSpinner(false);
          Notify_showMsg('error', 'Failed to get invoice!');
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
      console.log("saveInvoice: Nothing to do (invalid entry without _id)");
      return;
    } else if (self.data.customer()._id === undefined) {
      Notify_showMsg('error', 'Customer must be selected!');
      console.log("No customer selected: " + JSON.stringify(self.data.customer()));
      // self.nameError(true);
      return;
    }
    // self.nameError(false);
    var isNewInvoice = (self.data._id() == undefined) ? true : false;
    var ajaxData = JSON.stringify(self.data.getJson());
    var ajaxUrl = "/api/invoice/" + self.data._id();
    console.log("saveInvoice: AJAX PUT (url=" + ajaxUrl + "): JSON="
        + ajaxData);
    return $.ajax({
      url : ajaxUrl,
      type : "PUT",
      contentType : "application/json",
      data : ajaxData,
      dataType : "json",
      success : function(data) {
        console.log("saveInvoice: response: " + JSON.stringify(data));
        var opStr = "added";
        if (!isNewInvoice) {
          opStr = (data.invoice.isValid) ? 'updated' : 'deleted';
        }
        Notify_showMsg('success', 'Invoice <strong>#' + data.invoice.iid
            + '</strong> to customer id ' + data.invoice.customer.cid + ' '
            + opStr + '.');
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

  self.doInvoiceReport = function() {
    console.log("page.js - InvoiceNewViewModel - Report requested");
    if (self.data._id() !== undefined) {
      Notify_showSpinner(true);
      try {
        var child = window.open("/api/invoiceReport/" + self.data._id());
        $(child).ready(function() {
          console.log("page.js - InvoiceNewViewModel - Report done!");
          Notify_showSpinner(false);
        });
        child.focus();
      } catch (e) {
      }
    } else {
      Notify_showMsg('info', 'Cannot print unsaved invoice, please save it first.');
      console.log("page.js - InvoiceNewViewModel - Invoice not saved.");
    }
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

var SettingsDataModel = function() {
  var self = this;

  self.activeCompanyId = ko.observable();
  self.defaultNumDaysUntilPayment = ko.observable();

  self.setData = function(data) {
    self.activeCompanyId(data.activeCompanyId);
    self.defaultNumDaysUntilPayment(data.defaultNumDaysUntilPayment);

    for ( var prop in data) {
      if (data.hasOwnProperty(prop)) {
        console.log("Property " + prop + " = " + data[prop]);
      }
    }
  };

  self.setActiveCompanyId = function(id) {
    self.activeCompanyId(id);
  };
};

var SettingsViewModel = function(currentView, activeCompanyId,
    setActiveCompanyId) {
  var self = this;

  self.currentView = currentView;
  self.activeCompanyId = activeCompanyId;
  self.setActiveCompanyId = setActiveCompanyId;

  self.settings = new SettingsDataModel();

  self.currentView.subscribe(function(newValue) {
    if (newValue == 'settings') {
      console.log("page.js - SettingsViewModel - activated");
    }
  });

  self.populate = function() {
    Notify_showSpinner(true);
    $
        .getJSON(
            "/api/settings",
            function(settings) {
              self.settings.setData(settings);
              self.setActiveCompanyId(settings.activeCompanyId);
              self.activeCompanyId
                  .subscribe(function(newValue) {
                    console
                        .log("page.js - SettingsViewModel - Active company change detected: ID="
                            + newValue);
                    self.settings.setActiveCompanyId(newValue);
                  });
              Notify_showSpinner(false);
            }).fail(function() {
          console.log("page.js - SettingsViewModel - populate - failed");
          Notify_showSpinner(false);
          Notify_showMsg('error', 'Failed to get settings!');
        });
  };
};

var DebugViewModel = function(currentView) {
  var self = this;
  self.currentView = currentView;
  self.spinnerVisible = ko.observable(false);

  self.currentView.subscribe(function(newValue) {
    if (newValue == 'debug') {
      console.log("page.js - DebugViewModel - activated");
    }
  });

  self.spinnerVisible.subscribe(function(showSpinner) {
    console.log("page.js - DebugViewModel - showSpinner: " + showSpinner);
    Notify_showSpinner(showSpinner);
  });
};

var NavViewModel = function() {
  var self = this;
  
  self.mainViews = [ {
    name : '/page/home',
    title : 'Home',
    icon : 'glyphicon glyphicon-home',
    location : 'main'
  }, {
    name : '/page/companies',
    title : 'Administer Companies',
    icon : 'glyphicon glyphicon-wrench',
    location : 'companyMenu'
  }, {
    name : '/page/customers',
    title : 'Customers',
    icon : 'glyphicon glyphicon-user',
    location : 'main'
  }, {
    name : '/page/invoice_new',
    title : 'New Invoice',
    icon : 'glyphicon glyphicon-file',
    location : 'main'
  }, {
    name : '/page/invoices',
    title : 'Invoices',
    icon : 'glyphicon glyphicon-list',
    location : 'main'
  }, {
    name : '/page/settings',
    title : 'Settings',
    icon : 'glyphicon glyphicon-wrench',
    location : 'userMenu'
  }, {
    name : '/page/debug',
    title : 'Debug',
    icon : 'glyphicon glyphicon-eye-open',
    location : 'userMenu'
  }, {
    name : '/logout',
    title : 'Log out',
    icon : 'glyphicon glyphicon-log-out',
    location : 'userMenuNoRoute'
  } ];

  self.currentView = ko.observable();
  self.activeCompanyId = ko.observable();
  self.activeCompanyName = ko.observable();
  self.companyList = ko.observableArray();

  self.selectView = function(view) {
    location.hash = view.name;
  };
  
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

$(function() {
  console.log("page.js - init - begin");
  var navViewModel = new NavViewModel();
  var companyViewModel = new CompanyListViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId, navViewModel.activeCompanyName, navViewModel.companyList);
  var companyNewViewModel = new CompanyNewViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId,
      navViewModel.activeCompanyName);
  var customerListViewModel = new CustomerListViewModel(
      navViewModel.currentView, navViewModel.activeCompanyId);
  var invoiceListViewModel = new InvoiceListViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId);
  var invoiceNewViewModel = new InvoiceNewViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId);
  var settingsViewModel = new SettingsViewModel(navViewModel.currentView,
      navViewModel.activeCompanyId, companyViewModel.setActiveCompanyId);
  var debugViewModel = new DebugViewModel(navViewModel.currentView);

  settingsViewModel.populate();
  companyViewModel.populate();

  ko.applyBindings(navViewModel, document.getElementById("app-navbar"));

  ko.applyBindings(companyViewModel, document.getElementById("app-companies"));

  ko.applyBindings(companyNewViewModel, document
      .getElementById("app-company_new"));

  ko.applyBindings(customerListViewModel, document
      .getElementById("app-customer"));

  ko.applyBindings(invoiceListViewModel, document
      .getElementById("app-invoices"));

  ko.applyBindings(invoiceNewViewModel, document
      .getElementById("app-invoice_new"));

  ko.applyBindings(settingsViewModel, document.getElementById("app-settings"));

  ko.applyBindings(debugViewModel, document.getElementById("app-debug"));
});
