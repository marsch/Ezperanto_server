(function() {
  var CoreMeta, Meta;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  };
  CoreMeta = require('./meta');
  Meta = (function() {
    function Meta() {
      Meta.__super__.constructor.apply(this, arguments);
    }
    __extends(Meta, CoreMeta);
    Meta.prototype.load = function(options) {
      return Meta.__super__.load.call(this, options);
    };
    Meta.prototype.withContent = function(body) {
      this.content = {
        value: this.encode(body),
        contentType: this.contentType,
        charset: this.charset,
        contentEncoding: this.contentEncoding,
        links: this.encodeLinks(this.links),
        usermeta: this.encodeUsermeta(this.usermeta)
      };
      delete this.usermeta;
      delete this.links;
      return this;
    };
    Meta.prototype.encodeLinks = function(links) {
      var parsed;
      parsed = [];
      if (links && !Array.isArray(links)) {
        links = [links];
      }
      links.forEach(function(link) {
        return parsed.push(link);
      });
      return parsed;
    };
    Meta.prototype.encodeUsermeta = function(data) {
      var key, parsed, value;
      parsed = [];
      for (key in data) {
        value = data[key];
        parsed.push({
          key: key,
          value: value
        });
      }
      return parsed;
    };
    return Meta;
  })();
  module.exports = Meta;
}).call(this);
