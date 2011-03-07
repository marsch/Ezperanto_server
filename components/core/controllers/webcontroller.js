var dust = require('../../../deps/dust'),
	fs = require('fs'),
	gui = require('../lib/gui'),
	controller;


controller = function (spec) {
	var that = {}, message;
	
	
	that.message = function (req) { 
		if (!req) throw "param req is undefined or null";
		
        var err = req.session.error,
            msg = req.session.success;
        delete req.session.error;
        delete req.session.success; 
        if (err) {
        	return '<p class="msg error">' + err + '</p>';
        }
        if (msg) {
        	return '<p class="msg success">' + msg + '</p>';
        }
    };
	
	
	that.gui = gui; 
	that.bootstrap = function () {  
		that.loadViews(applications['server'].getTemplatePath());
		that.common = [that.onRequest];
	}; 
	
	that.loadViews = function (path, callback) {
		callback = callback || function () {};
		fs.readdir(path, function (err, entries) {
			if (err) {
				throw err;
			}
			var num_of_entries = entries.length; 
			entries.forEach(function (entry) {
				fs.stat(path + entry, function (err, stat) { 
					if (err) {
						throw err;
					} 
					if (stat.isDirectory() && entry.substring(0, 1) !== ".") { 
						that.loadViews(path + entry + "/", function (err, data) { 
							num_of_entries -= 1; 
							if (num_of_entries <= 0) { 
								return callback(null, true);
							}
						});
					}
					if (stat.isFile() && entry.substring(0, 1) !== ".") { 
						fs.readFile(path + entry, 'utf8', function (err, data) {
                			if (err) {
                				throw err;
                			} 
                			if (dust.cache[entry] === undefined || dust.cache[entry] === null) {
                				var template_name = path.split("/").slice(-2).join("/") + entry; 
                				dust.loadSource(dust.compile(data, template_name));    
                			}
                			num_of_entries -= 1; 
							if (num_of_entries <= 0) { 
								return callback(null, true);
							}
                		});
					}
					
				});
			});
		});
	}; 

	that.onRequest = function (req, res, next) { 
		that.gui.init(req, res);  
		next(); 
	};
	 
	
	
	return that;
}; 
exports = module.exports = controller({});