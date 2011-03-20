(function() {
  var Client, Http, HttpClient, Mapper, Meta, Utils;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __slice = Array.prototype.slice;
  Client = require('./client');
  Meta = require('./http_meta');
  Mapper = require('./mapper');
  Utils = require('./utils');
  Http = require('http');
  HttpClient = (function() {
    __extends(HttpClient, Client);
    function HttpClient(options) {
      var host, port, _ref;
      _ref = ['localhost', 8098], host = _ref[0], port = _ref[1];
      HttpClient.__super__.constructor.call(this, options);
      this.client = Http.createClient((options != null ? options.port : void 0) || port, (options != null ? options.host : void 0) || host);
      this.client.on('error', __bind(function(err) {
        this.emit('clientError', err);
        if (err.errno === process.ECONNREFUSED) {
          return this.client = Http.createClient(this.client.port, this.client.host);
        }
      }, this));
    }
    HttpClient.prototype.get = function() {
      var bucket, callback, key, meta, options, _ref;
      bucket = arguments[0], key = arguments[1], options = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      meta = new Meta(bucket, key, options);
      return this.execute('GET', meta)(__bind(function(data, meta) {
        return this.executeCallback(data, meta, callback);
      }, this));
    };
    HttpClient.prototype.head = function() {
      var bucket, callback, key, meta, options, _ref;
      bucket = arguments[0], key = arguments[1], options = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      meta = new Meta(bucket, key, options);
      return this.execute('HEAD', meta)(__bind(function(data, meta) {
        return this.executeCallback(data, meta, callback);
      }, this));
    };
    HttpClient.prototype.exists = function() {
      var bucket, callback, key, options, _cb, _ref;
      bucket = arguments[0], key = arguments[1], options = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      _cb = callback;
      callback = function(err, data, meta) {
        if (meta.statusCode === 404) {
          return _cb(null, false, meta);
        } else if (err) {
          return _cb(err, data, meta);
        } else {
          return _cb(err, true, meta);
        }
      };
      return this.head(bucket, key, options, callback);
    };
    HttpClient.prototype.getAll = function() {
      var bucket, callback, mapfunc, options, _ref;
      bucket = arguments[0], options = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      mapfunc = function(v, k, options) {
        var data, keys;
        data = options.noJSON ? Riak.mapValues(v)[0] : Riak.mapValuesJson(v)[0];
        if (options.where && !options.noJSON) {
          keys = [];
          for (var i in options.where) keys.push(i);
          if (keys.some(function(k) {
            return options.where[k] !== data[k];
          })) {
            return [];
          }
        }
        delete v.values;
        return [
          {
            meta: v,
            data: data
          }
        ];
      };
      return this.add(bucket).map(mapfunc, options).run(callback);
    };
    HttpClient.prototype.keys = function() {
      var bucket, callback, meta, options, _ref;
      bucket = arguments[0], options = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      options.keys = true;
      meta = new Meta(bucket, '', options);
      return this.execute('GET', meta)(__bind(function(data, meta) {
        return this.executeCallback(data.keys, meta, callback);
      }, this));
    };
    HttpClient.prototype.count = function() {
      var bucket, callback, options, _cb, _ref;
      bucket = arguments[0], options = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      _cb = callback;
      callback = function(err, data, meta) {
        if (!err) {
          data = data[0];
        }
        return _cb(err, data, meta);
      };
      return this.add(bucket).map(function(v) {
        return [1];
      }).reduce('Riak.reduceSum').run(callback);
    };
    HttpClient.prototype.walk = function() {
      var bucket, callback, key, linkPhases, options, spec, _ref;
      bucket = arguments[0], key = arguments[1], spec = arguments[2], options = 4 <= arguments.length ? __slice.call(arguments, 3) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      linkPhases = spec.map(function(unit) {
        return {
          bucket: unit[0] || '_',
          tag: unit[1] || '_',
          keep: unit[2] != null
        };
      });
      return this.add(key ? [[bucket, key]] : bucket).link(linkPhases).reduce({
        language: 'erlang',
        module: 'riak_kv_mapreduce',
        "function": 'reduce_set_union'
      }).map('Riak.mapValuesJson').run(options, callback);
    };
    HttpClient.prototype.save = function() {
      var bucket, callback, data, key, meta, options, verb, _ref;
      bucket = arguments[0], key = arguments[1], data = arguments[2], options = 4 <= arguments.length ? __slice.call(arguments, 3) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      data || (data = {});
      meta = new Meta(bucket, key, options);
      meta.data = data;
      verb = options.method || (key ? 'PUT' : 'POST');
      return this.execute(verb, meta)(__bind(function(data, meta) {
        return this.executeCallback(data, meta, callback);
      }, this));
    };
    HttpClient.prototype.remove = function() {
      var bucket, callback, key, meta, options, _ref;
      bucket = arguments[0], key = arguments[1], options = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      meta = new Meta(bucket, key, options);
      return this.execute('DELETE', meta)(__bind(function(data, meta) {
        return this.executeCallback(data, meta, callback);
      }, this));
    };
    HttpClient.prototype.add = function(inputs) {
      return new Mapper(this, inputs);
    };
    HttpClient.prototype.runJob = function(options, callback) {
      options.raw = 'mapred';
      return this.save('', '', options.data, options, callback);
    };
    HttpClient.prototype.end = function() {};
    HttpClient.prototype.buckets = function(callback) {
      var meta;
      meta = new Meta;
      meta.buckets = true;
      return this.execute('GET', meta)(__bind(function(data, meta) {
        return this.executeCallback(data, meta, callback);
      }, this));
    };
    HttpClient.prototype.getProps = function() {
      var bucket, callback, options, _ref;
      bucket = arguments[0], options = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      return this.get(bucket, void 0, options, callback);
    };
    HttpClient.prototype.updateProps = function() {
      var bucket, callback, options, props, _ref;
      bucket = arguments[0], props = arguments[1], options = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      options.method = 'PUT';
      return this.save(bucket, void 0, {
        props: props
      }, options, callback);
    };
    HttpClient.prototype.getLarge = function() {
      var callback, key, options, _ref;
      key = arguments[0], options = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      options.raw || (options.raw = 'luwak');
      options.responseEncoding = 'binary';
      return this.get(void 0, key, options, callback);
    };
    HttpClient.prototype.saveLarge = function() {
      var callback, data, key, options, _ref;
      key = arguments[0], data = arguments[1], options = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      options.raw || (options.raw = 'luwak');
      if (data instanceof Buffer) {
        return this.save(void 0, key, data, options, callback);
      } else {
        return callback(new Error('Data has to be a Buffer'));
      }
    };
    HttpClient.prototype.removeLarge = function() {
      var callback, key, options, _ref;
      key = arguments[0], options = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      options.raw || (options.raw = 'luwak');
      return this.remove(void 0, key, options, callback);
    };
    HttpClient.prototype.ping = function(callback) {
      var meta;
      meta = new Meta('', '', {
        raw: 'ping'
      });
      return this.execute('HEAD', meta)(__bind(function(data, meta) {
        return this.executeCallback(true, meta, callback);
      }, this));
    };
    HttpClient.prototype.stats = function(callback) {
      var meta;
      meta = new Meta('', '', {
        raw: 'stats'
      });
      return this.execute('GET', meta)(__bind(function(data, meta) {
        return this.executeCallback(data, meta, callback);
      }, this));
    };
    HttpClient.prototype.Meta = Meta;
    HttpClient.prototype.execute = function(verb, meta) {
      return __bind(function(callback) {
        var cbFired, onClose, path, request;
        verb = verb.toUpperCase();
        path = meta.path;
        this.log("" + verb + " " + path);
        request = this.client.request(verb, path, meta.toHeaders());
        if (meta.data) {
          request.write(meta.data, meta.contentEncoding);
          delete meta.data;
        }
        cbFired = false;
        onClose = __bind(function(hadError, reason) {
          if (hadError && !cbFired) {
            callback(new Error(reason));
          }
          return this.client.removeListener('close', onClose);
        }, this);
        this.client.on('close', onClose);
        request.on('response', __bind(function(response) {
          var buffer;
          response.setEncoding(meta.responseEncoding);
          buffer = '';
          response.on('data', function(chunk) {
            return buffer += chunk;
          });
          return response.on('end', __bind(function() {
            var boundary, err, _ref;
            meta = meta.loadResponse(response);
            buffer = (400 <= (_ref = meta.statusCode) && _ref <= 599) ? (err = new Error("HTTP error " + meta.statusCode + ": " + buffer), meta.statusCode === 404 ? err.message = void 0 : void 0, err.statusCode = meta.statusCode, err) : this.decodeBuffer(buffer, meta);
            if (meta.statusCode === 300 && meta.contentType.match(/^multipart\/mixed/)) {
              boundary = Utils.extractBoundary(meta.contentType);
              buffer = Utils.parseMultipart(buffer, boundary).map(__bind(function(doc) {
                var _meta;
                _meta = new Meta(meta.bucket, meta.key);
                _meta.loadResponse({
                  headers: doc.headers,
                  statusCode: meta.statusCode
                });
                _meta.vclock = meta.vclock;
                return {
                  meta: _meta,
                  data: this.decodeBuffer(doc.body, _meta)
                };
              }, this));
            }
            cbFired = true;
            return callback(buffer, meta);
          }, this));
        }, this));
        return request.end();
      }, this);
    };
    HttpClient.prototype.decodeBuffer = function(buffer, meta) {
      try {
        if (buffer.length > 0) {
          return meta.decode(buffer);
        } else {
          return void 0;
        }
      } catch (e) {
        return new Error("Cannot convert response into " + meta.contentType + ": " + e.message + " -- Response: " + buffer);
      }
    };
    return HttpClient;
  })();
  module.exports = HttpClient;
}).call(this);
