"use strict";

var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();

var winston = require('winston');

var transports = [];
if (appEnv && !appEnv.isLocal) {
  transports.push(new winston.transports.Console({ level: 'info' })); // error
} else {
  transports.push(new winston.transports.Console({ level: 'info' }));
}

module.exports = new winston.Logger({
  transports: transports
});
