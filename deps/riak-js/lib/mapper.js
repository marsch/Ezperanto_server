(function() {
  var Mapper;
  var __slice = Array.prototype.slice, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  Mapper = (function() {
    function Mapper(riak, inputs) {
      this.riak = riak;
      this.inputs = inputs;
      this.phases = [];
    }
    Mapper.prototype.map = function(phase, args) {
      return this.makePhases("map", phase, args);
    };
    Mapper.prototype.reduce = function(phase, args) {
      return this.makePhases("reduce", phase, args);
    };
    Mapper.prototype.link = function(phase) {
      return this.makePhases("link", phase);
    };
    Mapper.prototype.run = function() {
      var callback, options, _ref;
      options = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      _ref = this.riak.ensure(options), options = _ref[0], callback = _ref[1];
      return this.riak.runJob(this.job(this.inputs, options), callback);
    };
    Mapper.prototype.job = function(inputs, options) {
      options || (options = {});
      options.data = {
        inputs: inputs,
        query: this.phases
      };
      return options;
    };
    Mapper.prototype.makePhases = function(type, phase, args) {
      if (!Array.isArray(phase)) {
        phase = [phase];
      }
      phase.forEach(__bind(function(p) {
        var temp, _base;
        temp = {};
        if (p) {
          temp[type] = (function() {
            switch (typeof p) {
              case 'function':
                return {
                  source: p.toString(),
                  arg: args
                };
              case 'string':
                return {
                  name: p,
                  arg: args
                };
              case 'object':
                if (p.source != null) {
                  p.source = p.source.toString();
                }
                return p;
            }
          })();
          (_base = temp[type]).language || (_base.language = Mapper.defaults.language);
          return this.phases.push(temp);
        }
      }, this));
      return this;
    };
    return Mapper;
  })();
  Mapper.defaults = {
    language: 'javascript'
  };
  module.exports = Mapper;
}).call(this);
