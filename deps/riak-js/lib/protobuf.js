(function() {
  var Buffer, Connection, Pool, ProtoBuf, events, fs, net, path, sys;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  sys = require('sys');
  net = require('net');
  fs = require('fs');
  events = require('events');
  path = require('path');
  Buffer = require('buffer').Buffer;
  Pool = (function() {
    function Pool(options) {
      var _base, _base2, _base3;
      this.options = options || {};
      (_base = this.options).port || (_base.port = 8087);
      (_base2 = this.options).host || (_base2.host = '127.0.0.1');
      (_base3 = this.options).max || (_base3.max = 10);
      this.running = 0;
      this.pool = [];
      this.events = new events.EventEmitter();
    }
    Pool.prototype.start = function(callback) {
      if (!(this.running != null)) {
        return false;
      }
      this.next(function(conn) {
        if (conn.writable) {
          if (callback) {
            return callback(conn);
          }
        } else {
          return conn.on('connect', function() {
            if (callback) {
              return callback(conn);
            }
          });
        }
      });
      return true;
    };
    Pool.prototype.send = function(name, data) {
      return __bind(function(callback) {
        return this.start(function(conn) {
          return conn.send(name, data)(function(resp) {
            try {
              return callback(resp);
            } finally {
              conn.finish();
            }
          });
        });
      }, this);
    };
    Pool.prototype.finish = function(conn) {
      if (this.running != null) {
        this.running -= 1;
        this.events.emit('finish');
        if (this.pool.length < this.options.max) {
          return this.pool.push(conn);
        }
      } else {
        return conn.end();
      }
    };
    Pool.prototype.end = function() {
      this.running = null;
      return this.pool.forEach(function(conn) {
        return conn.end();
      });
    };
    Pool.prototype.next = function(callback) {
      var cb;
      if (this.running >= this.options.max) {
        return this.events.on('finish', (cb = __bind(function() {
          if (this.running < this.options.max) {
            callback(this.getConnection());
            return this.events.removeListener('finish', cb);
          }
        }, this)));
      } else {
        return callback(this.getConnection());
      }
    };
    Pool.prototype.getConnection = function() {
      this.running += 1;
      return this.pool.pop() || new Connection(this);
    };
    return Pool;
  })();
  Connection = (function() {
    function Connection(pool) {
      this.conn = net.createConnection(pool.options.port, pool.options.host);
      this.pool = pool;
      this.conn.on('data', __bind(function(chunk) {
        return this.receive(chunk);
      }, this));
      this.reset();
    }
    Connection.prototype.send = function(name, data) {
      return __bind(function(callback) {
        this.callback = callback;
        return this.conn.write(this.prepare(name, data));
      }, this);
    };
    Connection.prototype.finish = function() {
      return this.pool.finish(this);
    };
    Connection.prototype.end = function() {
      return this.conn.end();
    };
    Connection.prototype.on = function(event, listener) {
      this.conn.on(event, listener);
      return this;
    };
    Connection.prototype.prepare = function(name, data) {
      var buf, len, msg, type;
      type = ProtoBuf[name];
      if (data) {
        buf = type.serialize(data);
        len = buf.length + 1;
      } else {
        len = 1;
      }
      msg = new Buffer(len + 4);
      msg[0] = len >>> 24;
      msg[1] = len >>> 16;
      msg[2] = len >>> 8;
      msg[3] = len & 255;
      msg[4] = type.riak_code;
      if (buf) {
        buf.copy(msg, 5, 0);
      }
      return msg;
    };
    Connection.prototype.receive = function(chunk) {
      this.chunk = chunk;
      if (this.attempt_parse()) {
        if (this.pool.running != null) {
          return this.reset();
        } else {
          return this.end();
        }
      }
    };
    Connection.prototype.attempt_parse = function() {
      var code, data;
      if (data = this.parse()) {
        if ((data.errmsg != null) && (data.errcode != null)) {
          code = data.errcode;
          data = new Error(data.errmsg);
          data.errcode = code;
        }
        if (this.callback) {
          this.callback(data);
        }
        if (this.chunk_pos < this.chunk.length) {
          this.resp = null;
          return this.attempt_parse();
        } else {
          return true;
        }
      }
    };
    Connection.prototype.parse = function() {
      var bytes_read, ending;
      if (this.receiving) {
        ending = this.resp_len + this.chunk_pos;
        if (ending > this.chunk.length) {
          ending = this.chunk.length;
        }
        bytes_read = ending - this.chunk_pos;
        this.chunk.copy(this.resp, this.resp_pos, this.chunk_pos, ending);
        this.resp_pos += bytes_read;
        this.chunk_pos += bytes_read;
        if (this.resp_pos === this.resp_len) {
          return this.type.parse(this.resp);
        }
      } else {
        this.resp_len = (this.chunk[this.chunk_pos + 0] << 24) + (this.chunk[this.chunk_pos + 1] << 16) + (this.chunk[this.chunk_pos + 2] << 8) + this.chunk[this.chunk_pos + 3] - 1;
        this.type = ProtoBuf.type(this.chunk[this.chunk_pos + 4]);
        this.resp = new Buffer(this.resp_len);
        this.resp_pos = 0;
        this.chunk_pos += 5;
        return this.parse();
      }
    };
    Connection.prototype.reset = function() {
      this.type = null;
      this.resp = null;
      this.chunk = null;
      this.chunk_pos = 0;
      this.resp_pos = 0;
      return this.resp_len = 0;
    };
    return Connection;
  })();
  Connection.prototype.__defineGetter__('receiving', function() {
    return this.resp;
  });
  Connection.prototype.__defineGetter__('writable', function() {
    return this.conn.writable;
  });
  Pool.Connection = Connection;
  ProtoBuf = {
    types: ["ErrorResp", "PingReq", "PingResp", "GetClientIdReq", "GetClientIdResp", "SetClientIdReq", "SetClientIdResp", "GetServerInfoReq", "GetServerInfoResp", "GetReq", "GetResp", "PutReq", "PutResp", "DelReq", "DelResp", "ListBucketsReq", "ListBucketsResp", "ListKeysReq", "ListKeysResp", "GetBucketReq", "GetBucketResp", "SetBucketReq", "SetBucketResp", "MapRedReq", "MapRedResp"],
    type: function(num) {
      return this[this.types[num]];
    },
    schemaFile: path.join(path.dirname(module.filename), 'riak.desc')
  };
  ProtoBuf.__defineGetter__('schema', function() {
    return this._schema || (this._schema = new (require('protobuf_for_node').Schema)(fs.readFileSync(ProtoBuf.schemaFile)));
  });
  ProtoBuf.types.forEach(function(name) {
    var cached_name;
    cached_name = "_" + name;
    return ProtoBuf.__defineGetter__(name, function() {
      var code, sch;
      if (this[cached_name]) {
        return this[cached_name];
      } else {
        code = ProtoBuf.types.indexOf(name);
        if (sch = ProtoBuf.schema["Rpb" + name]) {
          sch.riak_code = code;
          return this[cached_name] = sch;
        } else {
          return this[cached_name] = {
            riak_code: code,
            parse: function() {
              return true;
            }
          };
        }
      }
    });
  });
  module.exports = Pool;
}).call(this);
