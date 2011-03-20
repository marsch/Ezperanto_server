var db = require('riak-js').getClient(); 

var riakModel = function (specs) {
	var that = {}, getAllMapRegExp;
	//init specs
	specs = specs || {};

	// private functions
	getAllMapRegExp = function (v, k, options) {
		var data, keys, i;
		data = options.noJSON ? Riak.mapValues(v)[0] : Riak.mapValuesJson(v)[0];
		if (options.where && !options.noJSON) {
			keys = [];
			for (i in options.where) {
				keys.push(i);
			} 
			if (keys.some(function (fieldname) { 
				if (data[fieldname]) {
					var re = new RegExp(options.where[fieldname], 'gi'),
						matches = data[fieldname].match(re);
					if (matches === null) {
						return true; 
					} else {
						return false;  
					}
				}
				return [];  
				 
			})) {
				return [];
			} 
		}
		delete v.values;
		if (options.meta) {
			return [
			        {
			        	meta: v,
			        	data: data
			        }
			    ];
		} else {
			return [data];
		}
	}; 


	// public functions
	that.init = function (bucket) {
		specs.bucket = bucket;
	};
	
	that.bucket = function (bucket) {
		specs.bucket = bucket;
		return that;
	}

	that.getItem = function (key, callback) {
		db.get(specs.bucket,key,function(err,data,meta) {
			if(!err) {
				data.vclock = meta.vclock; 
				callback(err,data);
			}
		}); 
	};

	that.getItems = function (options, sortfunction, offset, limit, callback) {
		// TODO:handle some inites here
		db.add(specs.bucket)
		.map(getAllMapRegExp, options)
		.reduce({name: 'Riak.reduceSort', arg: sortfunction})
		.reduce({name: 'Riak.reduceSlice', arg: [0 + offset, offset + limit]})
		.run(callback);
	};

	that.saveItem = function (item, callback) {
		var meta = {};
		if(item.vclock) {
			meta.vclock = item.vclock;
			delete item.vclock;
		}
		db.save(specs.bucket,item._id,item, meta,callback);
	};

	that.deleteItem = function (id, callback) {
		db.remove(specs.bucket,id, callback);
	};

	that.getAlphaNumSort = function (key, dir) {
		var dir = dir||'asc';
		var ldir = (dir=="asc")?"<":">";
		return ('(function (a,b) {  var x = (isNaN(parseInt(a.'+key+')))?(a.'+key+'.toLowerCase()):(parseInt(a.'+key+')); var y = (isNaN(parseInt(b.'+key+')))?(b.'+key+'.toLowerCase()):(parseInt(b.'+key+')); return ((x '+ldir+' y) ? -1 : ((y '+ldir+' x) ? 1 : 0))});').toString();
	};

	// return instance
	return that;
}

exports.RiakModel = module.exports = riakModel();
