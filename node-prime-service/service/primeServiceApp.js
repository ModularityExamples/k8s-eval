"use strict";

var express = require('express');
var logger = require('./logger');

var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();

var Promise = require('promise');

var auth = require('basic-auth');

var app = express();

var pgp = require('pg-promise')(/*options*/);
var db = null;

var pass = require('pwd');

var ps = require('./primeService');

function getDbConnStr() {
  if (appEnv && !appEnv.isLocal) {
    var postgresServiceCreds = appEnv.getServiceCreds('postgres');
    logger.info('Postgres database:', postgresServiceCreds.url);
    return postgresServiceCreds.url;
  } else {
    logger.info('Postgres database:', process.env.POSTGRES_URL);
    return process.env.POSTGRES_URL;
  }
}

function checkAuth(req, res, next) {
  var serviceId = req.params.service_id;
  var credentials = auth(req);

  if (!credentials) {
    logger.warn("No credentials provided");
    return setUnauthorized(null, res, serviceId);
  }

  initDb().then(function() {
      return getPasswordForServiceAndUser(serviceId, credentials['name']);
    }).then(function(data) {
        pass.hash(credentials['pass'], data.salt, function(err, hash){
          if (err) { return setUnauthorized(err, res, serviceId); }
          if (data.pwd !== hash) {
            logger.warn(`Unauthorized access to prime service '${serviceId}' (wrong password)`);
            return setUnauthorized(null, res, serviceId);
          } else {
            return next();
          }
        })
    }).catch(function(err) {
      setUnauthorized(err, res, serviceId);
    });
}

function setUnauthorized(err, res, serviceId) {
  err && logger.error(`Unauthorized access to prime service '${serviceId}':`, err);

  res.statusCode = 401;
  res.setHeader('WWW-Authenticate', `Basic realm="${serviceId}"`);
  res.end('Unauthorized');
}

function initDb() {
  if (!db) {
    db = pgp(getDbConnStr());
  }

  logger.info("Setting default schema...");
  return db.none(`SET search_path = 'prime'`);
}

function getPasswordForServiceAndUser(serviceId, user) {
  logger.info(`Retrieving password for service instance '${serviceId}' AND user = '${user}'`);
  return db.one(`SELECT pwd, salt FROM cred_bindings WHERE service_id = '${serviceId}' AND usr = '${user}'`);
}

function getCurrentPrime(req, res) {
  var serviceId = req.params.service_id;

  ps.getCurrentPrime(serviceId).then(function(prime) {
    res.set('Content-Type', 'application/json')
      .send(JSON.stringify({ "prime": prime }));
  }).catch(function(err) {
    logger.error(`Error while retrieving current prime for service instance '${serviceId}':`, err);
    res.status(500)
      .send("");
  });
}

function getNextPrime(req, res) {
  var serviceId = req.params.service_id;

  ps.getNextPrime(serviceId).then(function(prime) {
    res.set('Content-Type', 'application/json')
      .send(JSON.stringify({ "prime": prime }));
  }).catch(function(err) {
    logger.error(`Error while retrieving next prime for service instance '${serviceId}':`, err);
    res.status(500)
      .send("");
  });
}

app.get('/:service_id', checkAuth, getCurrentPrime);
app.put('/:service_id', checkAuth, getNextPrime);

var server = app.listen(process.env.VCAP_APP_PORT || process.env.APP_PORT || 3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  logger.info('Prime Service listening at http://%s:%s', host, port);
});
