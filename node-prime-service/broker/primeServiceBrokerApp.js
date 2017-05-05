"use strict";

var express = require('express');
var auth = require('basic-auth');
var YAML = require('yamljs');
var co = require('co');
var Q = require('q');
var logger = require('./logger');
var psb = require('./primeServiceBroker');

var yaml_load = function(file) {
  return new Promise(function(resolve, reject) {
      YAML.load(file, function(result) {
        resolve(result);
      });
  });
}

var app = express();

function fetchCatalog(req, res) {
  co(function *() {
    // TODO: allow configuring this file via an environment variable
    var services = yield yaml_load('services.yml');

    res.set('Content-Type', 'application/json')
      .send(JSON.stringify(services));
  });
}

function createInstance(req, res) {
  var serviceId = req.params.service_id;
  psb.provisionInstance(serviceId).then(function() {
    logger.info(`Service instance '${serviceId}' created`);
    res.set('Content-Type', 'application/json')
      .status(201)
      .send(JSON.stringify({}));
  }).catch(function(err) {
    logger.error(`Error while creating service instance '${serviceId}':`, err);
    res.status(500)
      .send("");
  });
}

function removeInstance(req, res) {
  var serviceId = req.params.service_id;

  psb.removeInstance(serviceId).then(function() {
    res.set('Content-Type', 'application/json')
      .status(200)
      .send(JSON.stringify({}));
  }).catch(function(err) {
    logger.error(`Error while removing service instance '${serviceId}':`, err);
    res.status(500)
      .send("");
  });
}

function createBinding(req, res) {
  var serviceId = req.params.service_id;
  var bindingId = req.params.binding_id;

  psb.createBinding(serviceId, bindingId).then(function(credentials) {
    res.set('Content-Type', 'application/json')
      .status(201)
      .send(JSON.stringify({
        credentials: credentials
      }));
  }).catch(function(err) {
    logger.error(`Error while creating binding '${bindingId}' for service instance '${serviceId}':`, err);
    res.status(500)
      .send("");
  });
}

function removeBinding(req, res) {
  var serviceId = req.params.service_id;
  var bindingId = req.params.binding_id;

  psb.removeBinding(serviceId, bindingId).then(function() {
    res.set('Content-Type', 'application/json')
      .status(200)
      .send(JSON.stringify({}));
  }).catch(function(err) {
    logger.error(`Error while removing service binding '${bindingId}' for service instance '${serviceId}':`, err);
    res.status(500)
      .send("");
  });
}

app.use(function(req, res, next) {
    var credentials = auth(req);

    if (!credentials ||
        credentials['name'] !== 'admin' ||
        credentials['pass'] !== 'admin') {
        res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Basic realm="Prime Service Broker"');
        res.end('Unauthorized');
    } else {
        next();
    }
});

app.get('/v2/catalog', fetchCatalog);
app.put('/v2/service_instances/:service_id', createInstance);
app.delete('/v2/service_instances/:service_id', removeInstance);
app.put('/v2/service_instances/:service_id/service_bindings/:binding_id', createBinding);
app.delete('/v2/service_instances/:service_id/service_bindings/:binding_id', removeBinding);

var server = app.listen(process.env.VCAP_APP_PORT || process.env.APP_PORT || 3333, function () {
  var host = server.address().address;
  var port = server.address().port;

  logger.info('Prime Service Broker listening at http://%s:%s', host, port);
});
