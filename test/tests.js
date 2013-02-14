var should = require('should');
var connect = require('connect');
var request = require('request');
var injector = require('./../lib/connect-injector');

describe('connect-injector', function () {
	it('does not mess with passed requests', function (done) {
		var rewriter = injector(function (req, res) {
			return false;
		}, function () {
			done('Should never be called');
		});

		var app = connect().use(rewriter).use(function (req, res) {
			res.writeHead(200, { 'Content-Type': 'text/plain' });
			res.end('Hello World\n');
		});

		var server = app.listen(9999).on('listening', function () {
			request('http://localhost:9999', function (error, response, body) {
				should.not.exist(error);
				response.headers['content-type'].should.equal('text/plain');
				body.should.equal('Hello World\n');
				server.close(done);
			});
		});
	});

	it('does some basic rewriting', function (done) {
		var REWRITTEN = 'Hello People';
		var rewriter = injector(function (req, res) {
			res.getHeader('content-type').should.equal('text/plain');
			return true;
		}, function (callback) {
			callback(null, REWRITTEN);
		});

		var app = connect().use(rewriter).use(function (req, res) {
			res.writeHead(200, { 'Content-Type': 'text/plain' });
			res.end('Hello World\n');
		});

		var server = app.listen(9999).on('listening', function () {
			request('http://localhost:9999', function (error, response, body) {
				should.not.exist(error);
				response.headers['content-type'].should.equal('text/plain');
				parseInt(response.headers['content-length']).should.equal(REWRITTEN.length);
				body.should.equal(REWRITTEN);
				server.close(done);
			});
		});
	});

	it('generates jsonp', function (done) {
		var PLAIN = 'Hello World\n';
		var OBJ = { hello: 'world' };

		var jsonp = injector(function(req, res) {
			var isJSON = res.getHeader('content-type').indexOf('application/json') === 0;
			return isJSON && req.query.callback;
		}, function(callback, data, req) {
			callback(null, req.query.callback + '(' + data.toString() + ')');
		});

		var app = connect().use(connect.query()).use(jsonp)
			.use('/plain', function (req, res) {
				res.writeHead(200, { 'Content-Type': 'text/plain' });
				res.end(PLAIN);
			}).use('/jsonp', function(req, res) {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(OBJ));
			});

		var server = app.listen(9999).on('listening', function () {
			// Plain request
			request('http://localhost:9999/plain', function (error, response, body) {
				should.not.exist(error);
				response.headers['content-type'].should.equal('text/plain');
				body.should.equal(PLAIN);
				// Normal JSON request
				request('http://localhost:9999/jsonp', function (error, response, body) {
					should.not.exist(error);
					response.headers['content-type'].should.equal('application/json');
					body.should.equal(JSON.stringify(OBJ));
					// JSONP request
					request('http://localhost:9999/jsonp?callback=stuff', function (error, response, body) {
						should.not.exist(error);
						response.headers['content-type'].should.equal('application/json');
						body.should.equal('stuff(' + JSON.stringify(OBJ) + ')');
						server.close();
						done();
					});
				});
			});
		});
	});

	it.skip('chains injectors', function (done) {
		// TODO
	});
});