setDefaultArg = function(arg, def) {
   return (typeof arg == 'undefined' ? def : arg);
};

var NotifyViewModel = function() {
    var self = this;
    self.notificationArray = ko.observableArray();
    self.spinnerVisible = ko.observable(cfg.showInitialTicker);
    self.spinnerNestingCount = ko.observable(0);
    self.spinnerMsg = ko.pureComputed(function() {
      var numDots = 3 * self.spinnerNestingCount();
      var dots = new Array(numDots + 1).join('.');
      return '<span class="glyphicon glyphicon-refresh glyphicon-spin"></span>' +
        '<p>' + cfg.tickerText + dots + '</p>';
    }, self);
    self.notificationPlacement = ko.observable(cfg.notificationAreaPlacement);
    self.notificationCss = ko.pureComputed(function() {
      return "notification-area-" + self.notificationPlacement();
    }, self);

    self.formatMsgHtml = function(kind, msg) {
        //var msgHtml = '<a class="close" href="#">×</a>' + msg;
        var icon = undefined;
        switch(kind) {
            default:
            case 'info':
            case 'success':
                break;
            case 'warn':
            case 'warning':
                //icon = "glyphicon-exclamation-sign";
                break;
            case 'error':
                //icon = "glyphicon-warning-sign";
                break;
        }
        var msgHtml = msg;
        if (icon !== undefined) {
          if (true) {
            msgHtml = '<span class="glyphicon ' + icon + '" aria-hidden="true"></span>' + msg;
          } else {
            msgHtml = '<span class="glyphicon ' + icon + '" aria-hidden="true"></span>' +
              '<p>' + msg + '</p>';
          }
        }
        return msgHtml;
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
                //self.msgInfo(msgHtml);
                break;
            case 'warn':
            case 'warning':
                prio = 'warning';
                //self.msgWarning(msgHtml);
                break;
            case 'error':
                prio = 'danger';
                hideDelayMs = 0; // Do not auto-hide error messages!
                //self.msgError(msgHtml);
                break;
            case 'success':
                prio = 'success';
                //self.msgSuccess(msgHtml);
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

var Notify_showSpinner = function(show) {
  spinnerShowCount = spinnerShowCount + (show?1:-1);
  if (spinnerShowCount < 0) {
    spinnerShowCount = 0;
  }
  spinnerVisible = spinnerShowCount > 0?true:false;
  console.log("Notify_showSpinner: show=" + show +
      ", spinnerShowCount=" + spinnerShowCount +
      ", visible=" + spinnerVisible);
  notifyViewModel.spinnerNestingCount(spinnerShowCount);
  notifyViewModel.spinnerVisible(spinnerVisible);
};

$(function() {
    console.log("notification.js - init - begin");
    ko.applyBindings(
        notifyViewModel,
        document.getElementById("notification-area"));
    console.log("notification.js - init - end");
});
