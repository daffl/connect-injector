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

				if(isIntercepted) {
					chunk = chunk instanceof Buffer ? chunk : new Buffer(chunk);
					buffer = Buffer.concat([buffer, chunk]);
					return true;
				}

				return this.old.write.apply(this, arguments);
			},
			end: function (data) {
				var self = this;
				if(data) {
					this.write(data);
				}

				if(!isIntercepted) {
					return this.old.end.apply(this);
				}

				converter.call(this, function (error, data) {
					res.setHeader('Content-Length', data.length);
					self.old.writeHead.apply(self, writeHeadArgs);
					self.old.end.call(self, data);
				}, buffer, req, res);
				return true;
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
				writeHeadArgs = [ statusCode ];
				if(reasonPhrase) {
					writeHeadArgs.push(reasonPhrase);
				}
			}
		};

		_.extend(res, mixin);

		next();
	}
}