(function() {
  var Meta, Utils, querystring;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  Utils = require('./utils');
  querystring = require('querystring');
  Meta = (function() {
    function Meta(bucket, key, options) {
      var _ref;
      if (arguments.length === 1 && bucket instanceof Object) {
        options = bucket;
        _ref = [options.bucket, options.key], bucket = _ref[0], key = _ref[1];
      }
      this.load(options);
      this.bucket = bucket;
      this.key = key;
    }
    Meta.prototype.decode = function(data) {
      if (this.responseEncoding === 'binary' || this.checkBinary(this.contentType)) {
        return new Buffer(data, 'binary');
      } else {
        switch (this.contentType) {
          case "application/json":
            return JSON.parse(data);
          default:
            return data;
        }
      }
    };
    Meta.prototype.encode = function(data) {
      var json;
      this.contentType = this.contentType != null ? this.resolveType(this.contentType) : data instanceof Buffer ? this.resolveType('binary') : typeof data === 'object' ? (json = JSON.stringify(data), this.resolveType('json')) : this.resolveType('plain');
      this.binary = this.checkBinary(this.contentType);
      if (this.binary && !data instanceof Buffer) {
        data = new Buffer(data, 'binary');
      }
      switch (this.contentType) {
        case "application/json":
          return json || JSON.stringify(data);
        default:
          if (this.binary != null) {
            return data;
          } else {
            return data.toString();
          }
      }
    };
    Meta.prototype.encodeData = function() {
      if (this.data != null) {
        return this.data = this.encode(this.data);
      }
    };
    Meta.prototype.resolveType = function(type) {
      switch (type) {
        case 'json':
          return 'application/json';
        case 'xml':
        case 'html':
        case 'plain':
          return "text/" + type;
        case 'jpeg':
        case 'gif':
        case 'png':
          return "image/" + type;
        case 'binary':
          return 'application/octet-stream';
        default:
          return type;
      }
    };
    Meta.prototype.checkBinary = function(type) {
      return /octet|^image|^video/.test(type);
    };
    Meta.prototype.load = function(options, additionalProperties, additionalDefaults) {
      var defaults, props;
      defaults = Utils.mixin(true, {}, Meta.defaults, additionalDefaults);
      if ((options != null ? options.links : void 0) && !Array.isArray(options.links)) {
        options.links = [options.links];
      }
      this.usermeta = Utils.mixin(true, {}, defaults, this, options);
      props = Utils.uniq(Meta.riakProperties.concat(additionalProperties).concat(Object.keys(defaults)));
      return props.forEach(__bind(function(key) {
        var value, _ref;
        value = (_ref = this.popKey(key)) != null ? _ref : Meta.defaults[key];
        if (value != null) {
          return this[key] = value;
        } else {
          return delete this[key];
        }
      }, this));
    };
    Meta.prototype.popKey = function(key) {
      var value;
      value = this.usermeta[key];
      delete this.usermeta[key];
      return value;
    };
    Meta.prototype.stringifyQuery = function(query) {
      var key, value;
      for (key in query) {
        value = query[key];
        if (typeof value === 'boolean') {
          query[key] = String(value);
        }
      }
      return querystring.stringify(query);
    };
    Meta.prototype.addLink = function(link) {
      var dupe;
      if (link) {
        dupe = this.links.some(function(l) {
          return l.bucket === link.bucket && l.key === link.key && (l.tag || '_') === (link.tag || '_');
        });
        if (!dupe) {
          return this.links.push(link);
        }
      }
    };
    Meta.prototype.removeLink = function(link) {
      if (link) {
        return this.links = this.links.filter(function(l) {
          return l.bucket !== link.bucket || l.key !== link.key || (l.tag !== link.tag && l.tag !== '_');
        });
      }
    };
    return Meta;
  })();
  Meta.riakProperties = ['bucket', 'key', 'contentType', 'vclock', 'lastMod', 'lastModUsecs', 'charset', 'contentEncoding', 'r', 'w', 'dw', 'rw', 'links', 'etag', 'raw', 'clientId', 'returnbody', 'vtag', 'range', 'contentRange', 'acceptRanges'];
  Meta.defaults = {
    links: [],
    binary: false,
    raw: 'riak',
    clientId: 'riak-js',
    contentEncoding: 'utf8',
    debug: true,
    data: void 0
  };
  module.exports = Meta;
}).call(this);
