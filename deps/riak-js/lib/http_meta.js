(function() {
  var CoreMeta, Meta, Utils, linkUtils;
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
  Meta = (function() {
    function Meta() {
      Meta.__super__.constructor.apply(this, arguments);
    }
    __extends(Meta, CoreMeta);
    Meta.prototype.load = function(options) {
      return Meta.__super__.load.call(this, options, Meta.riakProperties.concat(Meta.queryProperties), Meta.defaults);
    };
    Meta.prototype.responseMappings = {
      'content-type': 'contentType',
      'x-riak-vclock': 'vclock',
      'last-modified': 'lastMod',
      'etag': 'etag',
      'content-range': 'contentRange',
      'accept-ranges': 'acceptRanges'
    };
    Meta.prototype.loadResponse = function(response) {
      var $0, headers, k, u, v, _ref, _ref2;
      headers = response.headers;
      _ref = this.responseMappings;
      for (v in _ref) {
        k = _ref[v];
        this[k] = headers[v];
      }
      this.statusCode = response.statusCode;
      for (k in headers) {
        v = headers[k];
        u = k.match(/^X-Riak-Meta-(.*)/i);
        if (u) {
          this.usermeta[u[1]] = v;
        }
      }
      if (headers.link) {
        this.links = linkUtils.stringToLinks(headers.link);
      }
      if (headers.location) {
        _ref2 = headers.location.match(/\/([^\/]+)\/([^\/]+)\/([^\/]+)/), $0 = _ref2[0], this.raw = _ref2[1], this.bucket = _ref2[2], this.key = _ref2[3];
      }
      return this;
    };
    Meta.prototype.requestMappings = {
      accept: 'Accept',
      host: 'Host',
      clientId: 'X-Riak-ClientId',
      vclock: 'X-Riak-Vclock',
      range: 'Range'
    };
    Meta.prototype.toHeaders = function() {
      var headers, k, v, _ref, _ref2;
      headers = {};
      if (this.vclock == null) {
        delete this.requestMappings.clientId;
      }
      _ref = this.requestMappings;
      for (k in _ref) {
        v = _ref[k];
        if (this[k]) {
          headers[v] = this[k];
        }
      }
      _ref2 = this.usermeta;
      for (k in _ref2) {
        v = _ref2[k];
        headers["X-Riak-Meta-" + k] = String(v);
      }
      if (this.links.length > 0) {
        headers['Link'] = linkUtils.linksToString(this.links, this.raw);
      }
      if (this.data != null) {
        this.encodeData();
        headers['Content-Type'] = this.contentType;
        headers['Content-Length'] = this.data instanceof Buffer ? this.data.length : Buffer.byteLength(this.data);
      }
      return headers;
    };
    return Meta;
  })();
  Meta.prototype.__defineGetter__('path', function() {
    var bq, kq, qs, queryString;
    queryString = this.stringifyQuery(this.queryProps);
    bq = this.bucket ? "/" + this.bucket : '';
    kq = this.key ? "/" + this.key : '';
    qs = queryString ? "?" + queryString : '';
    return "/" + this.raw + bq + kq + qs;
  });
  Meta.prototype.__defineGetter__('queryProps', function() {
    var queryProps;
    queryProps = {};
    Meta.queryProperties.forEach(__bind(function(prop) {
      if (this[prop] != null) {
        return queryProps[prop] = this[prop];
      }
    }, this));
    return queryProps;
  });
  Meta.defaults = {
    host: 'localhost',
    accept: 'multipart/mixed, application/json;q=0.7, */*;q=0.5',
    responseEncoding: 'utf8'
  };
  Meta.queryProperties = ['r', 'w', 'dw', 'rw', 'keys', 'props', 'vtag', 'returnbody', 'chunked', 'buckets'];
  Meta.riakProperties = ['statusCode', 'host', 'responseEncoding'];
  module.exports = Meta;
  linkUtils = {
    stringToLinks: function(links) {
      var result;
      result = [];
      if (links) {
        links.split(',').forEach(function(link) {
          var captures, i;
          captures = link.trim().match(/^<\/([^\/]+)\/([^\/]+)\/([^\/]+)>;\sriaktag="(.+)"$/);
          if (captures) {
            for (i in captures) {
              captures[i] = decodeURIComponent(captures[i]);
            }
            return result.push({
              bucket: captures[2],
              key: captures[3],
              tag: captures[4]
            });
          }
        });
      }
      return result;
    },
    linksToString: function(links, raw) {
      return links.map(__bind(function(link) {
        return "</" + raw + "/" + (encodeURIComponent(link.bucket)) + "/" + (encodeURIComponent(link.key)) + ">; riaktag=\"" + (encodeURIComponent(link.tag || "_")) + "\"";
      }, this)).join(", ");
    }
  };
}).call(this);
