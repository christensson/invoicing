'use strict';

var UiOp = function() {
  var self = this;

  self.selectRoute = function(route) {
    location.hash = route;
  };
};

var Ui = new UiOp();

var SigninViewModel = function(currentView) {
  var self = this;
  self.currentView = currentView;

  self.currentView.subscribe(function(newValue) {
    if (newValue == 'signin') {
      Log.info("SigninViewModel - activated");
    }
  });

  this.isLocalRegVisible = ko.observable(false);

  self.toggleLocalReg = function() {
    var newState = !self.isLocalRegVisible();
    self.isLocalRegVisible(newState);
  };
};

var NavBarViewModel = function() {
  var self = this;

  self.currentView = ko.observable("");

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
  self.router.init(defaults.frontpageInitialRoute);
};

$(function() {
  var navViewModel = new NavBarViewModel();
  var signinViewModel = new SigninViewModel(navViewModel.currentView);

  ko.applyBindings(
    navViewModel,
    document.getElementById("app-navbar"));
  ko.applyBindings(
    signinViewModel,
    document.getElementById("signin"));
});
