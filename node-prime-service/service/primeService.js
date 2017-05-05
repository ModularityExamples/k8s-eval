"use strict";

var logger = require('./logger');

var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();

var co = require('co');

var pgp = require('pg-promise')(/*options*/);
var db = null;

var prime = require('./primeGenerator');

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

// TODO follow similar strategy pattern as with broker

function *initDb() {
  logger.info('Initializing database...');

  if (!db) {
    db = pgp(getDbConnStr());
  }

  logger.info('Setting default schema...');
  yield db.none(`SET search_path = 'prime'`);
}

function fetchCurrentPrimeFromDb(id) {
  return db.one(`SELECT number FROM number_store WHERE id = '${id}'`);
}

function getCurrentPrime(id) {
  return co(function *(){
    yield *initDb();
    var currentPrime = yield fetchCurrentPrimeFromDb(id);
    return currentPrime.number || 2;
  });
}

function getNextPrime(id) {
  // TODO: note this is not thread-safe but it's a demo, after all
  // You could create a lock file to lock the number store for a given id

  // TODO: update only if old prime is the same, otherwise, fetch newest value

  return co(function *() {
    yield *initDb();
    var currentPrime = yield fetchCurrentPrimeFromDb(id);
    var newPrime = prime(currentPrime.number);
    yield db.none(`UPDATE number_store SET number = ${newPrime} WHERE id = '${id}'`);
    return newPrime;
  });
}

module.exports.getCurrentPrime = getCurrentPrime;
module.exports.getNextPrime = getNextPrime;
