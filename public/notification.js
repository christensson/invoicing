setDefaultArg = function(arg, def) {
   return (typeof arg == 'undefined' ? def : arg);
};

var NotifyViewModel = function() {
    var self = this;
    self.notificationArray = ko.observableArray();
    self.spinnerVisible = ko.observable(cfg.showInitialTicker);
    self.spinnerMsg = ko.observable(cfg.tickerText);

    self.closeAll = function() {
      console.log("Notification: Close all");
      self.notificationArray.removeAll();
    };

    self.notificationCss = ko.pureComputed(function() {
      if (cfg.notificationAreaPlacement === 'center-inline') {
        return "col-md-6 col-md-offset-3 notification-area-center-inline";
      } else {
        return "notification-area-" + cfg.notificationAreaPlacement;
      }
    }, self);

    self.formatMsgHtml = function(kind, msg) {
      return msg;
    };

    self.showMsg = function(kind, msg, hideDelayMs) {
        hideDelayMs = setDefaultArg(hideDelayMs, 3000);
        console.log("Client message: " + kind + " : " + msg + " : delay=" + hideDelayMs);
        var msgHtml = self.formatMsgHtml(kind, msg);
        var prio = 'info';
        switch(kind) {
            default:
            case 'info':
                prio = 'info';
                break;
            case 'warn':
            case 'warning':
                prio = 'warning';
                break;
            case 'error':
                prio = 'danger';
                hideDelayMs = 0; // Do not auto-hide error messages!
                break;
            case 'success':
                prio = 'success';
                break;
        }
        var cssClass = 'list-group-item-' + prio;
        var notification = {'message': msgHtml, 'priority': prio, 'css': cssClass};
        notification.doClose = function() {
          console.log("Hiding client notification by click: " + JSON.stringify(notification));
          self.notificationArray.remove(notification);
        };
        console.log("showMsg: push notification: " + JSON.stringify(notification));
        self.notificationArray.push(notification);
        if (hideDelayMs > 0) {
            setTimeout(function(note) {
                    console.log("Hiding client notification: " + JSON.stringify(note));
                    self.notificationArray.remove(note);
                },
                hideDelayMs, notification);
        }
    };

    self.showServerMsg = function(serverMsg) {
        console.log("Server message: " + JSON.stringify(serverMsg));
        var notification = undefined;
        var hideDelayMs = 3000;
        if (serverMsg.error !== undefined && serverMsg.error.length > 0) {
            var msgHtml = self.formatMsgHtml('error', serverMsg.error);
            notification = {'message': msgHtml, 'priority': 'danger'};
            hideDelayMs = 0; // Do not auto-hide error messages!
        }
        if (serverMsg.success !== undefined && serverMsg.success.length > 0) {
            var msgHtml = self.formatMsgHtml('success', serverMsg.success);
            notification = {'message': msgHtml, 'priority': 'success'};
        }
        if (serverMsg.notice !== undefined && serverMsg.notice.length > 0) {
            var msgHtml = self.formatMsgHtml('info', serverMsg.notice);
            notification = {'message': msgHtml, 'priority': 'info'};
        }
        if (notification !== undefined) {
            notification.css = 'list-group-item-' + notification.priority;
            notification.doClose = function() {
              console.log("Hiding server notification by click: " + JSON.stringify(notification));
              self.notificationArray.remove(notification);
            };
            console.log("showServerMsg: push notification: " + JSON.stringify(notification));
            self.notificationArray.push(notification);
            if (hideDelayMs > 0) {
                setTimeout(function(note) {
                    console.log("Hiding server notification: " + JSON.stringify(note));
                    self.notificationArray.remove(note);
                },
                hideDelayMs, notification);
            }
        }
    };

    self.showServerMsg(serverMsg);
};

var notifyViewModel = new NotifyViewModel();

var Notify_showMsg = function(kind, msg, hideDelayMs) {
    notifyViewModel.showMsg(kind, msg, hideDelayMs);
};

var spinnerShowCount = 0;

var Notify_showSpinner = function(show, msg) {
  msg = typeof msg !== 'undefined' ? msg : cfg.tickerText;
  spinnerShowCount = spinnerShowCount + (show?1:-1);
  if (spinnerShowCount < 0) {
    spinnerShowCount = 0;
  }
  spinnerVisible = spinnerShowCount > 0?true:false;
  console.log("Notify_showSpinner: show=" + show +
      ", spinnerShowCount=" + spinnerShowCount +
      ", visible=" + spinnerVisible);
  notifyViewModel.spinnerMsg(msg);
  notifyViewModel.spinnerVisible(spinnerVisible);
};

$(function() {
    console.log("notification.js - init - begin");
    ko.applyBindings(
        notifyViewModel,
        document.getElementById("notification-area"));
    console.log("notification.js - init - end");
});
