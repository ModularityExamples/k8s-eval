"use strict";

var logger = require('./logger');

var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();

var Promise = require('promise');
var co = require('co');

var pgp = require('pg-promise')(/*options*/);
var db = null;

var md5 = require('md5');
var uuid = require('uuid');
var pass = require('pwd');

var targetHost = process.env.TARGET_HOST || 'http://prime-service.bosh-lite.com';

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

function *dbExists() {
  var sql = `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'prime'`;
  var data = yield db.oneOrNone(sql);
  return !!data;
}

function *initDb() {
  logger.info('Initializing database...');

  if (!db) {
    db = pgp(getDbConnStr());
  }

  var exists = yield *dbExists();
  logger.info(exists ? 'Database schema exists!' : 'Database schema does not exist!');

  if (!exists) {
    logger.info('Creating database schema...');
    yield db.none(`CREATE SCHEMA prime`);
  }

  logger.info('Setting default schema...');
  yield db.none(`SET search_path = 'prime'`);

  if (!exists) {
    logger.info('Creating tables...');
    yield db.none("CREATE TABLE number_store (id TEXT PRIMARY KEY, number INTEGER)");
    yield db.none("CREATE TABLE cred_bindings (binding_id TEXT PRIMARY KEY, service_id TEXT, usr TEXT, pwd TEXT, salt TEXT)");
  }
}

function closeDb() {
  logger.info('Closing database...');
  // no-op at present
  logger.info("Database closed.");
}

function inDb(generator) {
  return function(/* arguments */) {
    var args = arguments;
    return co(function *() {
      try {
        yield *initDb();
        var result = yield *generator.apply(this, args);
      } catch (e) {
        logger.error("Error while processing service broker request:", e);
        throw e;
      } finally {
        closeDb();
        return result;
      }
    });
  }
}

var provisionInstance = inDb(function *(instanceId) {
  logger.info(`Provisioning instance '${instanceId}'...`);
  yield db.none("INSERT INTO number_store VALUES ('" + instanceId +  "', NULL)");
  logger.info("Instance provisioned.");
});

var createBinding = inDb(function *(instanceId, bindingId) {
  logger.info(`Creating service binding '${bindingId}' for service instance '${instanceId}'...`);

  const user = md5(bindingId);
  const password = uuid.v4().replace(/-/g, '');

  const saltedHash = yield new Promise(function(resolve, reject) {
    pass.hash(password, function(err, salt, hash){
      if (err) { return reject(err); }
      resolve({
        salt: salt,
        hash: hash
      });
    });
  });

  yield db.none(`INSERT INTO cred_bindings VALUES ('${bindingId}', '${instanceId}', '${user}', '${saltedHash.hash}', '${saltedHash.salt}')`);

  logger.info(`Service binding '${bindingId}' for service instance '${instanceId}' created.`);

  return {
    "url": `${targetHost}/${instanceId}`,
    "user": user,
    "password": password
  };
});

var removeBinding = inDb(function *(instanceId, bindingId) {
  logger.info(`Removing service binding '${bindingId}' for service instance '${instanceId}'...`);
  yield db.none(`DELETE FROM cred_bindings WHERE binding_id = '${bindingId}'`);
  logger.info("Service binding removed.");
});

var removeInstance = inDb(function *(instanceId) {
  logger.info(`Removing service instance '${instanceId}'...`);
  yield db.none(`DELETE FROM number_store WHERE id = '${instanceId}'`);
  logger.info("Service instance removed.");
});

module.exports.provisionInstance = provisionInstance;
module.exports.createBinding = createBinding;
module.exports.removeBinding = removeBinding;
module.exports.removeInstance = removeInstance;
