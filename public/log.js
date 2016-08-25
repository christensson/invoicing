'use strict';

function Log(){};

Log._getCallerInfo = function() {
  var isFirefox = typeof InstallTrigger !== 'undefined';
  var isChrome = !!window.chrome && !!window.chrome.webstore;
  var err = undefined;
  try { throw Error(''); } catch(e) { err = e; }
  if (isChrome) {
    var callerLine = err.stack.split("\n")[4];
    var callerFuncStart = callerLine.indexOf("at ") + 3;
    return callerLine.slice(callerFuncStart, callerLine.length);
  } else if (isFirefox) {
    var callerLine = err.stack.split("\n")[3];
    var callerFuncEnd = callerLine.indexOf("@");
    return callerLine.slice(0, callerFuncEnd);
  } else {
    return "-";
  }
};

Log.backtrace = function(msg) {
  try { throw Error(''); } catch(e) { err = e; }
  var backtrace = err.stack.split("\n").slice(4).join("\n");
  console.log("BACKTRACE - msg\n" + backtrace);
};

Log.info = function(msg) {
  var functionName = Log._getCallerInfo();
  console.log("INFO - " + functionName + " - " + msg);
};

Log.warn = function(msg) {
  var functionName = Log._getCallerInfo();
  console.log("WARN - " + functionName + " - " + msg);
};

Log.error = function(msg) {
  var functionName = Log._getCallerInfo();
  console.log("ERROR - " + functionName + " - " + msg);
};
