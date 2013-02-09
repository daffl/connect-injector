var connect = require('connect');
var _ = require('underscore');
var httpProxy = require('http-proxy');
var proxy = new httpProxy.RoutingProxy();
var injector = require('./lib/connect-injector');

var inject = injector(function(req, res) {
	return res.getHeader('content-type') === 'application/javascript';
}, function(data, callback) {
	callback(null, "Some stuff: " + data.toString());
});

connect().use(inject)
.use('/proxy', function (req, res) {
	proxy.proxyRequest(req, res, {
		host: 'localhost',
		port: 80
	});
})
.use('/static', connect.static(__dirname)).listen(8000)
.listen(8000);