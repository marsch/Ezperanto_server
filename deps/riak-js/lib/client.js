(function() {
  var Client, CoreMeta, EventEmitter, Meta, Utils;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  CoreMeta = require('./meta');
  Utils = require('./utils');
  Meta = require('./meta');
  EventEmitter = require('events').EventEmitter;
  Client = (function() {
    __extends(Client, EventEmitter);
    function Client(options) {
      CoreMeta.defaults = Utils.mixin(true, {}, CoreMeta.defaults, options);
    }
    Client.prototype.executeCallback = function(data, meta, callback) {
      var def, err;
      def = __bind(function(err, data, meta) {
        return this.log(data, {
          json: this.contentType === 'json'
        });
      }, this);
      callback || (callback = def);
      err = null;
      if (data instanceof Error) {
        err = data;
        data = data.message;
        err.notFound = (meta != null ? meta.statusCode : void 0) === 404;
      }
      return callback(err, data, meta);
    };
    Client.prototype.ensure = function(options) {
      var callback, _ref;
      _ref = options, options = _ref[0], callback = _ref[1];
      if (typeof options === 'function') {
        callback = options;
        options = void 0;
      }
      return [options || {}, callback];
    };
    Client.prototype.log = function(string, options) {
      options || (options = {});
      if (string && console && (options.debug !== void 0 ? options.debug : CoreMeta.defaults.debug)) {
        if (options.json) {
          return console.dir(string);
        } else {
          return console.log(string);
        }
      }
    };
    Client.prototype.Meta = function() {
      throw new Error('APIs should override this function with their particular Meta implementation.');
    };
    return Client;
  })();
  module.exports = Client;
}).call(this);
