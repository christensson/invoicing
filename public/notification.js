setDefaultArg = function(arg, def) {
   return (typeof arg == 'undefined' ? def : arg);
}

var NotifyViewModel = function() {
    var self = this;
    self.notificationArray = ko.observableArray();
    self.spinnerVisible = ko.observable(cfg.showInitialTicker);
    self.spinnerMsg = ko.observable(
        '<span class="glyphicon glyphicon-refresh glyphicon-spin"></span>' +
        '<p>Loading...</p>');

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
                icon = "glyphicon-exclamation-sign";
                break;
            case 'error':
                icon = "glyphicon-warning-sign";
                break;
        }
        var msgHtml = msg;
        if (icon !== undefined) {
          msgHtml = '<span class="glyphicon ' + icon + '" aria-hidden="true"></span>' +
            '<p>' + msg + '</p>';
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
        var notification = {'message': msgHtml, 'priority': prio};
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

var Notify_showSpinner = function(show) {
    notifyViewModel.spinnerVisible(show);
};

$(function() {
    console.log("notification.js - init - begin");
    ko.applyBindings(
        notifyViewModel,
        document.getElementById("notification-area"));
    console.log("notification.js - init - end");
});
