CoreMeta = require './meta'
Utils    = require './utils'
Meta = require './meta'
EventEmitter = require('events').EventEmitter

class Client extends EventEmitter
  
  constructor: (options) ->
    # upon initialization, core meta should merge user-provided defaults for the session
    CoreMeta.defaults = Utils.mixin true, {}, CoreMeta.defaults, options
  
  executeCallback: (data, meta, callback) ->
    def = (err, data, meta) =>
      @log data, { json: @contentType is 'json' }
      
    callback or= def
    err = null
    
    if data instanceof Error
      err = data
      data = data.message
      err.notFound = meta?.statusCode is 404
    
    callback err, data, meta
    
  ensure: (options) ->
    [options, callback] = options
    if typeof options == 'function'
      callback = options
      options = undefined
    return [options or {}, callback]
    
  log: (string, options) ->
    options or= {}
    if string and console and (if options.debug isnt undefined then options.debug else CoreMeta.defaults.debug)
      if options.json then console.dir string else console.log string

  Meta: -> throw new Error('APIs should override this function with their particular Meta implementation.')

module.exports = Client