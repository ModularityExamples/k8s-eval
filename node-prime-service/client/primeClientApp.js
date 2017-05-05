"use strict";

var express = require('express');
var logger = require('./logger');

var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();

var amqp = require('amqplib/callback_api');
var q = 'tasks';
var tasks = [];

var request = require('request');

///// AMQP

function bail(err) {
  logger.error(err);
  //process.exit(1);
}

// Consumer
function consumer(conn) {
  var ok = conn.createChannel(on_open);
  function on_open(err, ch) {
    if (err != null) { return bail(err); }
    ch.assertQueue(q);
    ch.consume(q, function(msg) {
      if (msg !== null) {
        var task = msg.content.toString();
        logger.info("Task:", task);
        tasks.push(task);
        ch.ack(msg);
        if (task === "task #9") {
          setTimeout(bail.bind(this, "Maximum number of messages reached."), 500);
        }
      }
    });
  }
}

amqp.connect('amqp://192.168.50.100', function(err, conn) {
  if (err != null) { return bail(err); }
  consumer(conn);
});

//// PRIME SERVICE

function getPrimeServiceInfo() {
  if (appEnv && !appEnv.isLocal) {
    var creds = appEnv.getServiceCreds('prime');
    logger.info('Prime service:', creds);
    return creds;
  } else {
    logger.info('Prime service:', process.env.PRIME_URL);
    return JSON.parse(process.env.PRIME_URL);
  }
}

function getPrimeServiceURL() {
  return getPrimeServiceInfo().url;
}

function getPrimeServiceCreds() {
  var creds = getPrimeServiceInfo();
  return {
    username: creds.user,
    password: creds.password
  };
}

function getCurrentPrime(req, res) {
  request({ url: getPrimeServiceURL(), auth: getPrimeServiceCreds() }, function (err, res2, body) {
    if (err || res2.statusCode !== 200) {
      logger.error("Current prime could not be retrieved:", err || res2.statusCode);
      return res.status(500).send("");
    }

    res.status(200).send(body);
  })
}

function getNextPrime(req, res) {
  request({ url: getPrimeServiceURL(), method: 'PUT', auth: getPrimeServiceCreds() }, function (err, res2, body) {
    if (err || res2.statusCode !== 200) {
      logger.error("Next prime could not be retrieved:", err || res2.statusCode);
      return res.status(500).send("");
    }

    res.status(200).send(body);
  })
}

///// REST SERVICES

var app = express();

app.use(express.static('static'));

function serviceBindings(req, res) {
  res.set('Content-Type', 'application/json')
    .send(JSON.stringify( {
      "services": getPrimeServiceInfo(),
      "tasks": tasks
    }));
}

app.get('/service_bindings', serviceBindings);
app.get('/prime', getCurrentPrime);
app.put('/prime', getNextPrime);

var server = app.listen(process.env.VCAP_APP_PORT || process.env.APP_PORT || 3666, function () {
  var host = server.address().address;
  var port = server.address().port;

  logger.info('Prime Client listening at http://%s:%s', host, port);
});
