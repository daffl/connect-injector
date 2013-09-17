/*
 * connect-injector
 * https://github.com/daff/connect-injector
 *
 * Copyright (c) 2013 David Luecke
 * Licensed under the MIT license.
 */

var async = require('async');
var _ = require('underscore');
var Proto = require('uberproto');

var Buffer = require('buffer').Buffer;
var WritableStream = require('stream-buffers').WritableStreamBuffer;
var headerExp = /^([^:]+): *(.*)$/;
var parseHeaders = function (headers) {
  var result = {};
  headers.split('\r\n').forEach(function (line) {
    var match = headerExp.exec(line);
    if (match && match[1] && match[2]) {
      result[match[1].toLowerCase()] = match[2];
    }
  });
  return result;
}

module.exports = function (when, converter) {
  return function (req, res, next) {
    // Allows more than one injector
    if (res.injectors) {
      res.injectors.push({
        when: when,
        converter: converter
      });
      return next();
    }

    // An object that we can mix into the response
    var mixin = {
      injectors: [
        {
          when: when,
          converter: converter
        }
      ],
      // Checks if this response should be intercepted
      _interceptCheck: function () {
        var self = this;
        if (typeof this._isIntercepted === 'undefined') {
          // Got through all injector objects
          _.each(res.injectors, function (obj) {
            if (obj.when(req, res)) {
              self._isIntercepted = true;
              obj.active = true;
            }
          });

          if (!this._isIntercepted) {
            this._isIntercepted = false;
          }
        }
        return this._isIntercepted;
      },
      // Overwrite setting the response headers. We can't do content-length
      // so lets just use transfer-encoding chunked
      setHeader: function (name, value) {
        if (name === 'content-length' || name === 'Content-Length') {
          name = 'transfer-encoding';
          value = 'chunked';
        }
        return this._super(name, value);
      },
      // Overwrite writeHead since it can also set the headers and we need to override
      // the transfer-encoding
      writeHead: function(status, reasonPhrase, headers) {
        var mappedHeaders = {};

        _.each(headers || reasonPhrase, function(value, name) {
          name = name.toLowerCase();

          if (name === 'content-length') {
            name = 'transfer-encoding';
            value = 'chunked';
          }

          mappedHeaders[name] = value;
        });

        this._actualHeaders = mappedHeaders;

        if(headers) {
          return this._super(status, reasonPhrase, mappedHeaders);
        }

        return this._super(status, mappedHeaders);
      },
      // Returns the header even if it originally hasn't been set by pasing res._header
      getHeader: function (name) {
        var _super = this._super.apply(this, arguments);

        if (_super || !this._header) {
          return _super;
        }

        if(this._header) {
          this._actualHeaders = _.extend({}, this._actualHeaders, parseHeaders(this._header));
        }

        return this._actualHeaders[name.toLowerCase()];
      },
      // Write into the buffer if this request is intercepted
      write: function (chunk) {
        if (this._interceptCheck()) {
          if(!this._interceptBuffer) {
            this._interceptBuffer = new WritableStream();
          }

          this._interceptBuffer.write(chunk);
          return true;
        }

        return this._super.apply(this, arguments);
      },
      // End the request.
      end: function (data) {
        var self = this;
        var _super = this._super.bind(this);

        if (data) {
          this.write(data);
        }

        if (!this._isIntercepted) {
          return _super();
        }

        // Run all converters
        var converters = _.map(_.filter(this.injectors, function (obj) {
          return obj.active;
        }), function (obj) {
          var converter = obj.converter;
          return function (buf, callback) {
            converter.call(self, callback, buf, req, res);
          }
        });

        // Chain them up asynchronously in the correct order
        var converterChain = async.compose.apply(async, converters.reverse());
        converterChain(this._interceptBuffer.getContents(), function (error, data) {
          if (error) { return next(error); }

          _super(data);
        });

        return true;
      }
    };

    Proto.mixin(mixin, res);

    return next();
  }
}
