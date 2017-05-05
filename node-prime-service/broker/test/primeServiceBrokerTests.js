"use strict";

var logger = require('../logger');

var assert = require("assert");

var Promise = require('promise');

var pgp = require('pg-promise')(/*options*/);
var db = pgp(getDbConnStr());

var pass = require('pwd');

var psb = require('../primeServiceBroker');

function getDbConnStr() {
  logger.info('Postgres database:', process.env.POSTGRES_URL);
  return process.env.POSTGRES_URL;
}

function cleanUp(done) {
  db.none("DROP SCHEMA prime CASCADE").then(done).catch(done);
}

describe('Prime Service Broker', function(){
  describe('#provisionInstance', function(){
    it('should initialize the database if needed', function(done){
      psb.provisionInstance("1234-2345-3456").then(function() {
        return db.one(`SELECT EXISTS (
                         SELECT 1
                         FROM   information_schema.tables
                         WHERE  table_schema = 'prime'
                         AND    table_name = 'number_store'
                      )`);
      }).then(function(data) {
        assert.equal(data.exists, true);
        done();
      }).catch(done);
    });
    it('should create an empty number record', function(done){
      var id = "1a234f456";
      psb.provisionInstance(id).then(function() {
        return db.one(`SELECT id, number FROM number_store WHERE id='${id}'`);
      }).then(function(data) {
        assert.equal(data.id, id);
        assert.equal(data.number, null);
        done();
      }).catch(done);
    });
  });
  describe('#createBinding', function(){
    it('should create credentials', function(done){
      var serviceId = "1a234f456";
      const bindingId = "2345";
      var user = null;
      var password = null;
      psb.provisionInstance(serviceId).then(function() {
        return psb.createBinding(serviceId, bindingId);
      }).then(function(data) {
        user = data.user;
        password = data.password;
        return db.one(`SELECT service_id, usr, pwd, salt FROM cred_bindings WHERE binding_id='${bindingId}'`);
      }).then(function(data) {
        assert.equal(data.service_id, serviceId);
        assert.equal(data.usr, user);

        pass.hash(password, data.salt, function(err, hash){
          if (err) { return done(err); }
          assert.equal(data.pwd, hash);
          done();
        })
      }).catch(done);
    });
  });
  afterEach(cleanUp);
});
