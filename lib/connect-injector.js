/*
 * connect-injector
 * https://github.com/daff/connect-injector
 *
 * Copyright (c) 2013 David Luecke
 * Licensed under the MIT license.
 */

var Buffer = require('buffer').Buffer;
var _ = require('underscore');

module.exports = function(when, converter) {
	return function (req, res, next) {
		var buffer = new Buffer(0);
		var isIntercepted = null;
		var writeHeadArgs = [ 200 ];

		var mixin = {
			old: {
				write: res.write,
				end: res.end,
				writeHead: res.writeHead
			},
			write: function (chunk) {
				if (isIntercepted === null) {
					isIntercepted = when(req, res);
					if(!isIntercepted) {
						this.old.writeHead.call(this, writeHeadArgs);
					}
				}

				if (isIntercepted) {
					buffer = Buffer.concat([buffer, chunk]);
				} else {
					this.old.write.apply(this, arguments);
				}

				return this;
			},
			end: function () {
				var self = this,
					args = arguments;

				if (isIntercepted) {
					converter.call(this, function (error, data) {
						res.setHeader('content-length', data.length);
						self.old.writeHead.apply(self, writeHeadArgs);
						self.old.end.call(self, data);
					}, buffer, req, res);
				} else {
					self.old.end.apply(self, args);
				}

				return this;
			},
			writeHead: function (statusCode, reasonPhrase, headers) {
				var self = this;

				if (!headers) {
					headers = reasonPhrase;
					reasonPhrase = undefined;
				}

				// Set the headers instead of sending them directly
				_.each(headers, function (value, name) {
					self.setHeader(name, value);
				});

				// Arguments for writeHead at a later time
				writeHeadArgs = arguments;
			}
		};

		_.extend(res, mixin);

		next();
	}
}