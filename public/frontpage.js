'use strict';

var UiOp = function() {
  var self = this;

  self.selectRoute = function(route) {
    location.hash = route;
  };
};

var Ui = new UiOp();

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

  ko.applyBindings(
    navViewModel,
    document.getElementById("app-navbar"));
});
