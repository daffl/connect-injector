# connect-injector

A middleware to inject content into any HTTP response.

[![Build Status](https://travis-ci.org/daffl/connect-injector.png?branch=master)](https://travis-ci.org/daffl/connect-injector)

## Getting Started

Install the module with: `npm install connect-injector`

## Injecting

The basic API looks like this:

```javascript
var inject = require('connect-injector');

inject(function when(req, res) {
  // for this request and repsonse
  // return whether or not to enable injecting
}, function converter(callback, content, req, res) {
  callback // (error, data) with the injected data
  content // the entire response buffer
});
```

## Examples

A very useful example for connect-inject is to add [JSONP](http://en.wikipedia.org/wiki/JSONP)
support to any `application/json` repsonse:

```javascript
var inject = injector(function(req, res) {
  var isJSON = res.getHeader('content-type').indexOf('application/json') !== -1;
  return isJSON && req.query.callback;
}, function(callback, data, req, res) {
  callback(null, req.query.callback + '(' + data.toString() + ')');
});

// inject needs to be used before any middleware that writes to the response
connect().use(connect.query()).use(inject).use(/* your other middleware here */);
```

Now any `application/json` response will be wrapped into a callback if given the
`callback=xyz` query parameter.

## Release History

__0.2.1__

- Fix bug not setting `isIntercepted` properly

__0.2.0__

- Allow chaining injectors
- Unit tests and CI
- Fixes for writing correct headers
- Use [stream-buffers](https://github.com/samcday/node-stream-buffer) instead of concatenating

__0.1.0__

- Initial alpha release

## License

Copyright (c) 2013 David Luecke  
Licensed under the MIT license.
