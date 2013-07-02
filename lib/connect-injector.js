/*
 * connect-injector
 * https://github.com/daff/connect-injector
 *
 * Copyright (c) 2013 David Luecke
 * Licensed under the MIT license.
 */

var Buffer = require('buffer').Buffer;
var _ = require('underscore');
var async = require('async');
var WritableStream = require("stream-buffers").WritableStreamBuffer;
module.exports = function(when, converter) {
	return function (req, res, next) {
		// Allows more than one injector
		if(res.injectors) {
			res.injectors.push({
				when: when,
				converter: converter
			});
			return next();
		}

		var buffer = new WritableStream();
		var isIntercepted = null;
		var writeHeadArgs = [ 200 ];
		var interceptCheck = function() {
			if (isIntercepted === null) {
				_.each(res.injectors, function(obj) {
					if(obj.when(req, res)) {
						isIntercepted = true;
						obj.active = true;
					}
				});

				if(!isIntercepted) {
					isIntercepted = false;
					this.old.writeHead.call(this, writeHeadArgs);
				}
			}
			return isIntercepted;
		}

		var mixin = {
			injectors: [{
				when: when,
				converter: converter
			}],
			old: {
				write: res.write,
				end: res.end,
				writeHead: res.writeHead
			},
			write: function (chunk) {
				if(interceptCheck.call(this)) {
					buffer.write(chunk);
					return true;
				}

				return this.old.write.apply(this, arguments);
			},
			end: function (data) {
				var self = this;
				if(data) {
					this.write(data);
				}

				if(!interceptCheck.call(this)) {
					return this.old.end.apply(this);
				}

				var converters = _.map(_.filter(this.injectors, function(obj) {
					return obj.active;
				}), function(obj) {
					var converter = obj.converter;
					return function(buf, callback) {
						converter.call(self, callback, buf, req, res);
					}
				});

				var converterChain = async.compose.apply(async, converters.reverse());
				converterChain(buffer.getContents(), function(error, data) {
					if(error) {
						return next(error);
					}
					res.setHeader('Content-Length', data.length);
					self.old.writeHead.apply(self, writeHeadArgs);
					self.old.end.call(self, data);
				});
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
				reasonPhrase && writeHeadArgs.push(reasonPhrase);
			}
		};

		_.extend(res, mixin);

		return next();
	}
}