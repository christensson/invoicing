var SigninViewModel = function() {
  var self = this;

  this.isLocalRegVisible = ko.observable(false);

  self.toggleLocalReg = function() {
    var newState = !self.isLocalRegVisible();
    self.isLocalRegVisible(newState);
  };
};

$(function() {
  var viewModel = new SigninViewModel();

  ko.applyBindings(
    viewModel,
    document.getElementById("signin"));
});
