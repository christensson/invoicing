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
    self.nameError = ko.observable(false);
    self.hasErrorCss = ko.pureComputed(function() {
        //return this.nameError() ? "has-error" : "";
        return this.nameError() ? "highlighterror" : "";
    }, self);

    self.updateServer = function() {
        if ((self._id() == undefined) &&
            !self.isValid())
        {
            console.log("updateServer: Nothing to do (invalid entry without _id)")
            return;
        } else if (self.name().length == 0) {
            Notify_showMsg('error', 'Customer <strong>name</strong> must be specified!');
            self.nameError(true);
            return;
        }
        self.nameError(false);
        var isNewCustomer = (self._id() == undefined) ? true : false;
        return $.ajax({
            url: "/api/customer/" + self._id(),
            type: "PUT",
            contentType: "application/json",
            data: JSON.stringify({
                _id: self._id(),
                cid: self.cid(),
                uid: self.uid(),
                name: self.name(),
                addr1: self.addr1(),
                addr2: self.addr2(),
                phone: self.phone(),
                isValid: self.isValid()
            }),
            dataType: "json",
            success: function(data) {
                var operation = "";
                console.log("updateServer: response: " + JSON.stringify(data));
                var opStr = "added";
                if (!isNewCustomer) {
                    opStr = (data.customer.isValid)?'updated':'deleted';
                }
                Notify_showMsg('success', 'Customer <strong>' + data.customer.name +
                    '</strong> with customer id ' + data.customer.cid + ' ' + opStr + '.');
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
 
var CustomerListViewModel = function(currentView) {
    var self = this;

    self.currentView = currentView;

    self.currentView.subscribe(function(newValue) {
        if (newValue == 'customers') {
            console.log("page.js - CustomerListViewModel - activated")
            self.populate();
        }
    });

    // Customer part
    self.customerList = ko.observableArray();
    
    self.populate = function() {
        Notify_showSpinner(true);
        $.getJSON("/api/customers", function(allData) {
            var mappedCustomers =
            $.map(allData, function(item) {
                return new CustomerViewModel(item)});
            self.customerList(mappedCustomers);
            Notify_showSpinner(false);
        }).fail(function() {
            console.log("page.js - CustomerListViewModel - populate - failed");
            Notify_showSpinner(false);
            Notify_showMsg('error', 'Failed to get customers!');
        });
    }

    self.newCustomer = function() {
        var data = {
            _id: undefined,
            cid: undefined,
            uid: undefined,
            name: "",
            addr1: "",
            addr2: "",
            phone: "",
            isValid: true
        }
        self.customerList.push(new CustomerViewModel(data));
    }

    self.deleteCustomer = function(c) {
        console.log("Delete: " + JSON.stringify(c));
        c.isValid(false);
        self.customerList.destroy(c);
    }

    self.doCustomersReport = function() {
        console.log("Report requested");
        Notify_showSpinner(true);
        try {
            var child = window.open("/api/customersReport");
            $(child).ready(function(){
                console.log("Report done!");
                Notify_showSpinner(false);
            });
            child.focus();
        } catch (e) { }
    }
};


var InvoiceItemViewModel = function(data) {
    var self = this;

    self.description = ko.observable(data.description);
    self.price = ko.observable(data.price);
    self.count = ko.observable(data.count);
    self.vat = ko.observable(data.vat);
    self.isValid = ko.observable(data.isValid);
    self.total = ko.pureComputed(function() {
        var total = parseFloat(this.count()) * parseFloat(this.price());
        return total;
    }, self);

    self.updateServer = function() {
        if (!self.isValid())
        {
            console.log("updateServer: Nothing to do (invalid entry)")
            return;
        }
        console.log("updateServer: Doing nothing yet...")
    };

    self.getJson = function() {
	var res = {
	    description: self.description(),
	    price: self.price(),
	    count: self.count(),
	    vat: self.vat(),
	    total: self.total(),
	    isValid: self.isValid()
	};
	return res;
    };
};

var InvoiceDataViewModel = function(data) {
    var self = this;
    self._id = ko.observable(data._id);
    self.iid = ko.observable(data.iid);
    self.uid = ko.observable(data.uid);
    self.isValid = ko.observable(data.isValid);
    self.isLocked = ko.observable(data.isLocked);
    self.customer = ko.observable(data.customer);
    self.invoiceItems = ko.observableArray();
    for (var i = 0; i < data.invoiceItems.length; i++) {
	self.invoiceItems.push(new InvoiceItemViewModel(data.invoiceItems[i]));
    }
	
    self.numInvoiceItems = ko.pureComputed(function() {
        var sum = 0;
        for (var i = 0; i < this.invoiceItems().length; i++) {
            if (this.invoiceItems()[i].isValid()) {
                sum += 1;
            }
        }
        return sum;
    }, this);

    self.totalExclVat = ko.pureComputed(function() {
        var sum = 0;
        for (var i = 0; i < this.invoiceItems().length; i++) {
            if (this.invoiceItems()[i].isValid()) {
                sum += this.invoiceItems()[i].total();
            }
        }
        return sum;
    }, this);
    self.totalInclVat = ko.pureComputed(function() {
        var sum = 0;
        for (var i = 0; i < this.invoiceItems().length; i++) {
            if (this.invoiceItems()[i].isValid()) {
                sum += this.invoiceItems()[i].total() * (1 + parseFloat(this.invoiceItems()[i].vat()));
            }
        }
        return sum;
    }, this);

    self.setCustomer = function(data) {
	self.customer(data);
    };

    self.newInvoiceItem = function() {
        var data = {
            description: "",
            price: 0.0,
            count: 1.0,
            vat: 0.25,
            isValid: true
        }
        self.invoiceItems.push(new InvoiceItemViewModel(data));
    };

    self.deleteInvoiceItem = function(item) {
        item.isValid(false);
        self.invoiceItems.destroy(item);
    };

    self.doToggleLocked = function() {
        self.isLocked(!self.isLocked());
        console.log("page.js - InvoiceNewViewModel - isLocked=" + self.isLocked() + " (new state)");
    };

    self.getJson = function() {
	var items = [];
        for (var i = 0; i < self.invoiceItems().length; i++) {
	    items.push(self.invoiceItems()[i].getJson());
        }
	var res = {
            _id: self._id(),
	    iid: self.iid(),
            uid: self.uid(),
	    isLocked: self.isLocked(),
            isValid: self.isValid(),
	    customer: self.customer(),
	    invoiceItems: items,
	    totalExclVat: self.totalExclVat(),
	    totalInclVat: self.totalInclVat()
	};
	return res;
    };
}

var InvoiceDataViewModelInit = function() {
    var data = {
        _id: undefined,
	iid: undefined,
        uid: undefined,
	customer: {
	    _id: undefined,
            cid: undefined,
            name: "",
            addr1: "",
            addr2: "",
	},
	isLocked: false,
        isValid: true,
	invoiceItems: []
    };
    return new InvoiceDataViewModel(data);
}

var InvoiceListViewModel = function(currentView) {
    var self = this;

    self.currentView = currentView;

    self.currentView.subscribe(function(newValue) {
        if (newValue == 'invoices') {
            console.log("page.js - InvoiceListViewModel - activated")
            self.populate();
        }
    });

    // Invoice part
    self.invoiceList = ko.observableArray();
    
    self.populate = function() {
        Notify_showSpinner(true);
        $.getJSON("/api/invoices", function(allData) {
            var mappedInvoices = $.map(allData, function(item) {
                return new InvoiceDataViewModel(item)});
            self.invoiceList(mappedInvoices);
            Notify_showSpinner(false);
        }).fail(function() {
            console.log("page.js - InvoiceListViewModel - populate - failed");
            Notify_showSpinner(false);
            Notify_showMsg('error', 'Failed to get invoices!');
        });
    }

    self.deleteInvoice = function(c) {
        console.log("Delete: " + JSON.stringify(c));
        c.isValid(false);
        self.invoiceList.destroy(c);
    }
};

var InvoiceCustomerModel = function(data) {
    var self = this;
    self.data = data;
    self.toString = function() {
        return "" + self.data.cid + " - " + self.data.name;
    }
    // Override toJSON method since typeahead reads the JSON for the suggestion list
    self.toJSON = function() {
        return self.toString();
    }
}

var InvoiceNewViewModel = function(currentView) {
    var self = this;

    self.data = InvoiceDataViewModelInit();    

    self.currentView = currentView;
    self.customerList = ko.observableArray();

    self.currentView.subscribe(function(newValue) {
        if (newValue == 'invoice_new') {
            console.log("page.js - InvoiceNewViewModel - activated")
            self.populate();
        }
    });


    $('#customerId').bind('typeahead:selected', function(obj, datum, name) {
        // Extract customer id from datum
        console.log("page.js - InvoiceNewViewModel - Customer selected - " + JSON.stringify(datum.data));
	self.data.setCustomer(datum.data);
    });

    self.populate = function() {
        Notify_showSpinner(true);
        $.getJSON("/api/customers", function(allData) {
            var mappedCustomers =
                $.map(allData, function(item) {
                    return new InvoiceCustomerModel(item);//"" + item.cid + " - " + item.name;
                });
            self.customerList(mappedCustomers);
            Notify_showSpinner(false);
        }).fail(function() {
            console.log("page.js - InvoiceNewViewModel - populate - failed");
            Notify_showSpinner(false);
            Notify_showMsg('error', 'Failed to get customers!');
        });
    }

    self.updateServer = function() {
        if ((self.data._id() == undefined) &&
            !self.data.isValid())
        {
            console.log("updateServer: Nothing to do (invalid entry without _id)");
            return;
        } else if (self.data.customer()._id == undefined) {
            Notify_showMsg('error', 'Customer must be selected!');
            //self.nameError(true);
            return;
        }
        //self.nameError(false);
        var isNewInvoice = (self.data._id() == undefined) ? true : false;
	var ajaxData = JSON.stringify(self.data.getJson());
	var ajaxUrl = "/api/invoice/" + self.data._id();	
        console.log("updateServer: AJAX PUT (url=" + ajaxUrl + "): JSON=" + ajaxData);
        return $.ajax({
            url: ajaxUrl,
            type: "PUT",
            contentType: "application/json",
            data: ajaxData,
            dataType: "json",
            success: function(data) {
                var operation = "";
                console.log("updateServer: response: " + JSON.stringify(data));
                var opStr = "added";
                if (!isNewInvoice) {
                    opStr = (data.invoice.isValid)?'updated':'deleted';
                }
                Notify_showMsg('success', 'Invoice <strong>#' + data.invoice.iid +
			       '</strong> to customer id ' + data.invoice.customer.cid + ' ' + opStr + '.');
		// Set params set from server
                self.data._id(data.invoice._id);
                self.data.iid(data.invoice.iid);
                self.data.uid(data.invoice.uid);
                self.data.isValid(data.invoice.isValid);
            },
        });
    };

    self.newItem = function() {
	self.data.newInvoiceItem();
    }
    self.deleteItem = function(item) {
        console.log("page.js - InvoiceNewViewModel - delete: " + JSON.stringify(item));
	self.data.deleteInvoiceItem(item);
    }
    self.doToggleLocked = function(item) {
        self.data.doToggleLocked();
    }
};

var SettingsViewModel = function(currentView) {
    var self = this;

    self.currentView = currentView;

    self.currentView.subscribe(function(newValue) {
        if (newValue == 'settings') {
            console.log("page.js - SettingsViewModel - activated")
        }
    });    
};

var DebugViewModel = function(currentView) {
    var self = this;
    self.currentView = currentView;
    self.spinnerVisible = ko.observable(false);

    self.currentView.subscribe(function(newValue) {
        if (newValue == 'debug') {
            console.log("page.js - DebugViewModel - activated")
        }
    });

    self.spinnerVisible.subscribe(function(showSpinner) {
        console.log("page.js - DebugViewModel - showSpinner: " + showSpinner);
        Notify_showSpinner(showSpinner);
    });
};

var NavViewModel = function() {
    var self = this;

    self.mainViews = [
        {name: '/page/home',
         title: 'Home',
         icon: 'glyphicon glyphicon-home',
         location: 'main'},
        {name: '/page/customers',
         title: 'Customers',
         icon: 'glyphicon glyphicon-user',
         location: 'main'},
        {name: '/page/invoice_new',
         title: 'New Invoice',
         icon: 'glyphicon glyphicon-file',
         location: 'main'},
        {name: '/page/invoices',
         title: 'Invoices',
         icon: 'glyphicon glyphicon-list',
         location: 'main'},
        {name: '/page/settings',
         title: 'Settings',
         icon: 'glyphicon glyphicon-wrench',
         location: 'userMenu'},
        {name: '/page/debug',
         title: 'Debug',
         icon: 'glyphicon glyphicon-eye-open',
         location: 'userMenu'},
        {name: '/logout',
         title: 'Log out',
         icon: 'glyphicon glyphicon-log-out',
         location: 'userMenuNoRoute'}
        ];
    self.currentView = ko.observable();

    self.selectView = function(view) {
        location.hash = view.name;
    };

    self.routes = {
        '/page/:view' : function(view) {
            self.currentView(view);
            console.log("page.js - navigation - view: " + view);
        }
    };
    self.router = Router(self.routes);
    self.router.init(self.mainViews[0].name);
};

$(function() {
    console.log("page.js - init - begin");
    var navViewModel = new NavViewModel();
    var customerViewModel = new CustomerListViewModel(navViewModel.currentView);
    var invoiceListViewModel = new InvoiceListViewModel(navViewModel.currentView);
    var invoiceNewViewModel = new InvoiceNewViewModel(navViewModel.currentView);
    var settingsViewModel = new SettingsViewModel(navViewModel.currentView);
    var debugViewModel = new DebugViewModel(navViewModel.currentView);
 
    ko.applyBindings(
        navViewModel,
        document.getElementById("app-navbar"));

    ko.applyBindings(
        customerViewModel,
        document.getElementById("app-customer"));

    ko.applyBindings(
        invoiceListViewModel,
        document.getElementById("app-invoices"));

    ko.applyBindings(
        invoiceNewViewModel,
        document.getElementById("app-invoice_new"));

    ko.applyBindings(
        settingsViewModel,
        document.getElementById("app-settings"));

    ko.applyBindings(
        debugViewModel,
        document.getElementById("app-debug"));
});
