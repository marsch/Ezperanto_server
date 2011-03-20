(function() {
  var Client, Mapper, Meta, Pool, ProtoBufClient;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __slice = Array.prototype.slice, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  Client = require('./client');
  Pool = require('./protobuf');
  Meta = require('./protobuf_meta');
  Mapper = require('./mapper');
  ProtoBufClient = (function() {
    function ProtoBufClient() {
      ProtoBufClient.__super__.constructor.apply(this, arguments);
    }
    __extends(ProtoBufClient, Client);
    ProtoBufClient.prototype.get = function() {
      var bucket, callback, key, meta, options, _ref;
      bucket = arguments[0], key = arguments[1], options = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      meta = new Meta(bucket, key, options);
      return this.send("GetReq", meta)(__bind(function(data) {
        return this.executeCallback(this.processValueResponse(meta, data), meta, callback);
      }, this));
    };
    ProtoBufClient.prototype.save = function() {
      var body, bucket, callback, key, meta, options, _ref;
      bucket = arguments[0], key = arguments[1], body = arguments[2], options = 4 <= arguments.length ? __slice.call(arguments, 3) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      meta = new Meta(bucket, key, options);
      return this.send("PutReq", meta.withContent(body))(__bind(function(data) {
        return this.executeCallback(this.processValueResponse(meta, data), meta, callback);
      }, this));
    };
    ProtoBufClient.prototype.remove = function() {
      var bucket, callback, key, meta, options, _ref;
      bucket = arguments[0], key = arguments[1], options = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      meta = new Meta(bucket, key, options);
      return this.send("DelReq", meta)(__bind(function(data, meta) {
        return this.executeCallback(data, meta, callback);
      }, this));
    };
    ProtoBufClient.prototype.add = function(inputs) {
      return new Mapper(this, inputs);
    };
    ProtoBufClient.prototype.ping = function(callback) {
      return this.send('PingReq')(__bind(function(data, meta) {
        return this.executeCallback(data, meta, callback);
      }, this));
    };
    ProtoBufClient.prototype.end = function() {
      if (this.connection) {
        return this.connection.end();
      }
    };
    ProtoBufClient.prototype.buckets = function(callback) {
      return this.send('ListBucketsReq')(__bind(function(data, meta) {
        return this.executeCallback(data.buckets, meta, callback);
      }, this));
    };
    ProtoBufClient.prototype.keys = function(bucket, callback) {
      var keys;
      keys = [];
      return this.send('ListKeysReq', {
        bucket: bucket
      })(__bind(function(data, meta) {
        return this.processKeysResponse(data, keys, meta, callback);
      }, this));
    };
    ProtoBufClient.prototype.serverInfo = function(callback) {
      return this.send('GetServerInfoReq')(__bind(function(data, meta) {
        return this.executeCallback(data, meta, callback);
      }, this));
    };
    ProtoBufClient.prototype.runJob = function(job, callback) {
      var body, resp;
      body = {
        request: JSON.stringify(job.data),
        contentType: 'application/json'
      };
      resp = {
        phases: []
      };
      return this.send("MapRedReq", body)(__bind(function(data, meta) {
        return this.processMapReduceResponse(data, resp, meta, callback);
      }, this));
    };
    ProtoBufClient.prototype.send = function(name, data) {
      if ((this.connection != null) && this.connection.writable) {
        return this.connection.send(name, data);
      } else {
        return __bind(function(callback) {
          return this.pool.start(__bind(function(conn) {
            this.connection = conn;
            return this.connection.send(name, data)(callback);
          }, this));
        }, this);
      }
    };
    ProtoBufClient.prototype.processKeysResponse = function(data, keys, meta, callback) {
      if (data.errcode) {
        this.executeCallback(data, meta, callback);
      }
      if (data.keys) {
        data.keys.forEach(function(key) {
          return keys.push(key);
        });
      }
      if (data.done) {
        return this.executeCallback(keys, meta, callback);
      }
    };
    ProtoBufClient.prototype.processMapReduceResponse = function(data, resp, meta, callback) {
      var parsed;
      if (data.errcode) {
        this.executeCallback(data, meta, callback);
      }
      if (data.phase != null) {
        if (resp.phases.indexOf(data.phase) === -1) {
          resp.phases.push(data.phase);
        }
        parsed = JSON.parse(data.response);
        if (resp[data.phase] != null) {
          parsed.forEach(function(item) {
            return resp[data.phase].push(item);
          });
        } else {
          resp[data.phase] = parsed;
        }
      }
      if (data.done) {
        return this.executeCallback(resp, meta, callback);
      }
    };
    ProtoBufClient.prototype.processValueResponse = function(meta, data) {
      var content, value, _ref;
      delete meta.content;
      if ((data.content != null) && (data.content[0] != null) && (data.vclock != null)) {
        _ref = this.processValue(data.content[0]), content = _ref[0], value = _ref[1];
        meta.load(content);
        meta.vclock = data.vclock;
        return meta.decode(value);
      }
    };
    ProtoBufClient.prototype.processValue = function(content) {
      var value, _ref;
      value = content.value;
      if (((_ref = content.usermeta) != null ? _ref.forEach : void 0) != null) {
        content.usermeta.forEach(function(pair) {
          return content[pair.key] = pair.value;
        });
      }
      delete content.value;
      delete content.usermeta;
      return [content, value];
    };
    ProtoBufClient.prototype.Meta = Meta;
    return ProtoBufClient;
  })();
  module.exports = ProtoBufClient;
}).call(this);
