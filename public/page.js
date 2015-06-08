var CustomerViewModel = function(data) {
    this.isSelected = ko.observable(false);
    this._id = ko.observable(data._id);
    this.cid = ko.observable(data.cid);
    this.uid = ko.observable(data.uid);
    this.name = ko.observable(data.name);
    this.addr1 = ko.observable(data.addr1);
    this.addr2 = ko.observable(data.addr2);
    this.phone = ko.observable(data.phone);
    this.isValid = ko.observable(data.isValid);
    this.nameError = ko.observable(false);

    var self = this;

    this.updateServer = function() {
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

    this.name.subscribe(this.updateServer);
    this.addr1.subscribe(this.updateServer);
    this.addr2.subscribe(this.updateServer);
    this.phone.subscribe(this.updateServer);
    this.isValid.subscribe(this.updateServer);
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

var InvoiceListViewModel = function(currentView) {
    var self = this;

    self.currentView = currentView;

    self.currentView.subscribe(function(newValue) {
        if (newValue == 'invoices') {
            console.log("page.js - InvoiceListViewModel - activated")
        }
    });
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
        {name: '/page/invoices',
         title: 'Invoices',
         icon: 'glyphicon glyphicon-file',
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
    var invoiceViewModel = new InvoiceListViewModel(navViewModel.currentView);
    var settingsViewModel = new SettingsViewModel(navViewModel.currentView);
    var debugViewModel = new DebugViewModel(navViewModel.currentView);
 
    ko.applyBindings(
        navViewModel,
        document.getElementById("app-navbar"));

    ko.applyBindings(
        customerViewModel,
        document.getElementById("app-customer"));

    ko.applyBindings(
        invoiceViewModel,
        document.getElementById("app-invoice"));

    ko.applyBindings(
        settingsViewModel,
        document.getElementById("app-settings"));

    ko.applyBindings(
        debugViewModel,
        document.getElementById("app-debug"));

    console.log("page.js - init - end");
});
