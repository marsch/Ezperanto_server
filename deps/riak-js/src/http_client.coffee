Client = require './client'
Meta = require './http_meta'
Mapper = require './mapper'
Utils = require './utils'
Http = require 'http'

class HttpClient extends Client
  constructor: (options) ->
    # client-specific defaults
    [host, port] = ['localhost', 8098]
    super options
    @client = Http.createClient options?.port or port, options?.host or host

    @client.on 'error', (err) =>
      @emit 'clientError', err
      if err.errno is process.ECONNREFUSED
        # if connection is refused (node down) leave a client ready for when it's up again
        @client = Http.createClient(@client.port, @client.host)
    
    
  get: (bucket, key, options...) ->
    [options, callback] = @ensure options
    meta = new Meta bucket, key, options
    @execute('GET', meta) (data, meta) =>
      @executeCallback data, meta, callback

  head: (bucket, key, options...) ->
    [options, callback] = @ensure options
    meta = new Meta bucket, key, options
    @execute('HEAD', meta) (data, meta) =>
      @executeCallback data, meta, callback
      
  exists: (bucket, key, options...) ->
    [options, callback] = @ensure options
    
    _cb = callback # proxy callback
    callback = (err, data, meta) ->
      if meta.statusCode is 404
        _cb(null, false, meta)
      else if err
        _cb(err, data, meta)
      else
        _cb(err, true, meta)
    
    @head(bucket, key, options, callback)

  getAll: (bucket, options...) ->
    [options, callback] = @ensure options
    
    mapfunc = (v, k, options) ->
      data = if options.noJSON then Riak.mapValues(v)[0] else Riak.mapValuesJson(v)[0]
      if options.where and not options.noJSON
        keys = []; `for (var i in options.where) keys.push(i)`
        if keys.some((k) -> options.where[k] isnt data[k]) then return []
      delete v.values
      [{ meta: v, data: data }]
        
    @add(bucket).map(mapfunc, options).run callback
 
  keys: (bucket, options...) ->
    [options, callback] = @ensure options
    options.keys = true
    meta = new Meta bucket, '', options
    @execute('GET', meta) (data, meta) =>
      @executeCallback data.keys, meta, callback
  
  count: (bucket, options...) ->
    [options, callback] = @ensure options
    
    _cb = callback  # proxy callback
    callback = (err, data, meta) ->
      if not err then [data] = data
      _cb(err, data, meta)
      
    @add(bucket).map((v) -> [1]).reduce('Riak.reduceSum').run callback
    
  walk: (bucket, key, spec, options...) ->
    [options, callback] = @ensure options
    linkPhases = spec.map (unit) ->
      bucket: unit[0] or '_', tag: unit[1] or '_', keep: unit[2]?
      
    @add(if key then [[bucket, key]] else bucket)
      .link(linkPhases)
      .reduce(language: 'erlang', module: 'riak_kv_mapreduce', function: 'reduce_set_union')
      .map('Riak.mapValuesJson')
      .run(options, callback)
   
  save: (bucket, key, data, options...) ->
    [options, callback] = @ensure options
    data or= {}
    
    meta = new Meta bucket, key, options
    meta.data = data

    verb = options.method or if key then 'PUT' else 'POST'
    @execute(verb, meta) (data, meta) =>
      @executeCallback data, meta, callback
  
  remove: (bucket, key, options...) ->
    [options, callback] = @ensure options
    meta = new Meta bucket, key, options
    @execute('DELETE', meta) (data, meta) =>
      @executeCallback data, meta, callback

  # map/reduce

  add: (inputs) -> new Mapper this, inputs
    
  runJob: (options, callback) ->
    options.raw = 'mapred'
    @save '', '', options.data, options, callback

  end: ->
    
  # bucket props
  
  # new in 0.14 -- won't rely on this feature for tests until later
  buckets: (callback) ->
    meta = new Meta
    meta.buckets = true
    @execute('GET', meta) (data, meta) =>
      @executeCallback data, meta, callback      
  
  getProps: (bucket, options...) ->
    [options, callback] = @ensure options
    @get bucket, undefined, options, callback
  
  updateProps: (bucket, props, options...) ->
    [options, callback] = @ensure options
    options.method = 'PUT'
    @save bucket, undefined, { props: props }, options, callback
    
  # luwak

  getLarge: (key, options...) ->
    [options, callback] = @ensure options
    options.raw or= 'luwak'
    options.responseEncoding = 'binary'
    @get undefined, key, options, callback

  saveLarge: (key, data, options...) ->
    [options, callback] = @ensure options
    options.raw or= 'luwak'
    
    if data instanceof Buffer
      @save undefined, key, data, options, callback
    else
      callback(new Error('Data has to be a Buffer'))

  removeLarge: (key, options...) ->
    [options, callback] = @ensure options
    options.raw or= 'luwak'
    @remove undefined, key, options, callback  

  # node commands

  ping: (callback) ->
    meta = new Meta '', '', raw: 'ping'
    @execute('HEAD', meta) (data, meta) =>
      @executeCallback true, meta, callback

  stats: (callback) ->
    meta = new Meta '', '', raw: 'stats'
    @execute('GET', meta) (data, meta) =>
      @executeCallback data, meta, callback
      
  # provide particular Meta impl to clients
  
  Meta: Meta
        
  # private
  
  execute: (verb, meta) ->
    
    (callback) =>
      verb = verb.toUpperCase()
      path = meta.path
      @log "#{verb} #{path}"

      request = @client.request verb, path, meta.toHeaders()
      
      if meta.data
        request.write meta.data, meta.contentEncoding
        delete meta.data

      # use felixge's approach
      cbFired = false
      onClose = (hadError, reason) =>
        if hadError and not cbFired then callback new Error(reason)
        @client.removeListener 'close', onClose

      @client.on 'close', onClose
      
      request.on 'response', (response) =>
        response.setEncoding meta.responseEncoding
        buffer = ''

        response.on 'data', (chunk) -> buffer += chunk
        response.on 'end', =>
          meta = meta.loadResponse response

          buffer = if 400 <= meta.statusCode <= 599
            err = new Error "HTTP error #{meta.statusCode}: #{buffer}"
            err.message = undefined if meta.statusCode is 404 # message == undefined to be in sync with pbc
            err.statusCode = meta.statusCode # handier access to the HTTP status in case of an error
            err
          else @decodeBuffer(buffer, meta)
            
          if meta.statusCode is 300 and meta.contentType.match /^multipart\/mixed/ # multiple choices
            boundary = Utils.extractBoundary meta.contentType
            buffer = Utils.parseMultipart(buffer, boundary).map (doc) =>
              _meta = new Meta(meta.bucket, meta.key)
              _meta.loadResponse { headers: doc.headers, statusCode: meta.statusCode }
              _meta.vclock = meta.vclock
              { meta: _meta, data: @decodeBuffer(doc.body, _meta) }
            
          cbFired = true
          callback buffer, meta
          
      request.end()

  # http client utils

  decodeBuffer: (buffer, meta) ->
    try
      if buffer.length > 0 then meta.decode(buffer) else undefined
    catch e
      new Error "Cannot convert response into #{meta.contentType}: #{e.message} -- Response: #{buffer}"

module.exports = HttpClient