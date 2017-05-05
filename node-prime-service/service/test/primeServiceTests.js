"use strict";

var logger = require('../logger');

var assert = require("assert");

var pgp = require('pg-promise')(/*options*/);
var db = pgp(getDbConnStr());

var psb = require('../../broker/primeServiceBroker');
var prime = require('../primeGenerator');
var ps = require('../primeService');

function getDbConnStr() {
  logger.info('Postgres database:', process.env.POSTGRES_URL);
  return process.env.POSTGRES_URL;
}

function setUp(done) {
  psb.provisionInstance("4711").then(done.bind(this, null)).catch(done);
}

function cleanUp(done) {
  db.none("DROP SCHEMA prime CASCADE").then(done).catch(done);
}

describe('Prime Generator Function', function(){
  describe('#prime', function(){
    it('should yield prime 2 after 0', function(done){
      assert.equal(prime(0), 2, "should be 2");
      return done();
    });
    it('should yield prime 7 after 6', function(done){
      assert.equal(prime(6), 7, "should be 7");
      return done();
    });
    it('should yield prime 13 after 12', function(done){
      assert.equal(prime(12), 13, "should be 13");
      return done();
    });
  });
});

describe('Prime Service', function(){
  describe('#getCurrentPrime', function(){
    it('should yield 2 as first prime', function(done){
      ps.getCurrentPrime(4711).then(function(res) {
        assert.equal(2, res, "should be 2");
        return done();
      }).catch(function(err) {
        return done(err);
      });
    });
  });
  describe('#getNextPrime', function(){
    it('should yield 2, 3, 5, 7, 11 for successive calls', function(done){
      ps.getNextPrime(4711).then(function(res) {
        assert.equal(2, res, "should be 2");
        return ps.getNextPrime(4711);
      }).then(function(res) {
        assert.equal(3, res, "should be 3");
        return ps.getNextPrime(4711);
      }).then(function(res) {
        assert.equal(5, res, "should be 5");
        return ps.getNextPrime(4711);
      }).then(function(res) {
        assert.equal(7, res, "should be 7");
        return ps.getNextPrime(4711);
      }).then(function(res) {
        assert.equal(11, res, "should be 11");
        return done();
      }).catch(function(err) {
        return done(err);
      });
    });
  });
  beforeEach(setUp)
  afterEach(cleanUp);
});
