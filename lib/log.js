'use strict';

var winston = require('winston');
var defaults = require('../public/default').get();
var path = require('path');

var logger = new (winston.Logger)({
  transports: [
    new winston.transports.Console({
      json: false,
      timestamp: true,
      handleExceptions: true,
      humanReadableUnhandledException: true,
      level: 'info',
    }),
    new winston.transports.File({
      json: false,
      timestamp: true,
      handleExceptions: true,
      humanReadableUnhandledException: true,
      filename: path.join(__dirname, "..", defaults.logFile),
      level: 'verbose',
      colorize: false,
    })
  ],
  exitOnError: false
});

logger.stream = {
  write: function(message, encoding) {
    logger.info(message.trim());
  }
};

module.exports = logger;
