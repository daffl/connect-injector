var connect = require('connect');
var _ = require('underscore');
var httpProxy = require('http-proxy');
var proxy = new httpProxy.RoutingProxy();
var injector = require('./../lib/connect-injector');
var url = require('url');

var inject = injector(function(req, res) {
	var isJSON = res.getHeader('content-type').indexOf('application/json') !== -1;
	return isJSON && req.query.callback;
}, function(callback, data, req) {
	callback(null, req.query.callback + '(' + data.toString() + ')');
});

connect().use(connect.query())
.use(inject)
.use('/proxy', function (req, res) {
	proxy.proxyRequest(req, res, {
		host: 'localhost',
		port: 80
	});
})
.use('/static', connect.static(__dirname + '/..')).listen(8000);