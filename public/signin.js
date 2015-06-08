var SigninViewModel = function() {
    var self = this;

    this.isSignInVisible = ko.observable(true);
    this.isLocalRegVisible = ko.observable(false);

    self.activateSignIn = function() {
        self.isLocalRegVisible(false);
        self.isSignInVisible(true);
    }
    self.activateLocalReg = function() {
        self.isSignInVisible(false);
        self.isLocalRegVisible(true);
    }
};



$(function() {
    var viewModel = new SigninViewModel();
 
    ko.applyBindings(
        viewModel,
        document.getElementById("signin"));
});
