"use strict";

var logger = require('../logger');

var assert = require('assert');
var request = require('supertest');

var pgp = require('pg-promise')(/*options*/);
var db = pgp(getDbConnStr());

var psba = require('../primeServiceBrokerApp');

var url = 'http://localhost:3333';

function getDbConnStr() {
  logger.info('Postgres database:', process.env.POSTGRES_URL);
  return process.env.POSTGRES_URL;
}

function cleanUp(done) {
  db.none("DROP SCHEMA prime CASCADE").then(done).catch(done);
}

describe('Prime Service Broker App', function(){
  describe('#fetchCatalog', function(){
    it('should yield service plans', function(done){
      request(url)
      	.get('/v2/catalog')
        .auth('admin', 'admin')
        .expect(200)
      	.end(function(err, res) {
          if (err) { throw err; }

          done();
        });
    });
  });
  describe('(non-catalog)', function() {
    describe('#createInstance', function(){
      it('should provision instance', function(done){
        request(url)
        	.put('/v2/service_instances/4711')
          .auth('admin', 'admin')
          .expect(201)
        	.end(function(err, res) {
            if (err) { throw err; }

            done();
          });
      });
    });
    describe('#createBinding', function(){
      it('should create binding', function(done){
        request(url)
        	.put('/v2/service_instances/4711/service_bindings/10815')
          .auth('admin', 'admin')
          .expect(201)
          .expect(function(res) {
            assert(res.body);
            assert(res.body.credentials.url);
            assert(res.body.credentials.user);
            assert(res.body.credentials.password);
          })
        	.end(function(err, res) {
            if (err) { throw err; }

            done();
          });
      });
    });
    afterEach(cleanUp);
  });
});
