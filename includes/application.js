require("../lib/underscore/underscore");
//require('log4js')(); 


var express = require('../deps/express'),
    fs      = require('fs'),
    application;
    
application = function (specs) {
	var that, 
		httpApp, 
		port, 
		worker, 
		vhost_server, 
		app_host,  
		loadModules,
		components = [],
	    config = require('../etc/config'),
		init;
	
	that = {};
	specs = specs || {};  
  
  //private functions
	loadComponents = function (path, callback) { 
		//init core component at first (important! for template overwrite and initial settings)
		var core_loaded = false,
			components_loaded = false,
			callback = callback || function () {};
			
		fs.readdir(path + '/components/core/controllers', function (err, controllerFiles) {
            if (err) {
            	throw err;
            }
            var core_controllers_to_boot = controllerFiles.length;
            controllerFiles.forEach(function (controllerFile) {
            	core_controllers_to_boot -= 1;
            	if (controllerFile.substring(0, 1) !== ".") {  
            		module = require(path + '/components/core/controllers/' + controllerFile);
            		module.bootstrap();
                }
            	if (core_controllers_to_boot <= 0) {
            		core_loaded = true;
            		if (components_loaded === true && core_loaded === true) { 
            			callback(true);
            		}
            	}
            });
        });
		
		
		fs.readdir(path + '/components', function (err, files) {
	        var module, 
	        	number_of_component_folders = files.length;
	        	my_number_of_controller_files = 0; 
	        if (err) { 
	        	throw err;
	        };
	        
	        files.forEach(function (file) {   
	        	if (file.substring(0, 1) !== ".") {
	                fs.stat(path + '/components/' + file, function (err, stat) {
	                	if (err) {
	                		throw err;
	                	}
	                	if (stat.isDirectory() && file !== "core") {
	                		fs.stat(path + '/components/' + file + "/controllers", function (err, moduleStat) {
			                    if (err) {
			                    	return false; 
			                    }
			                    if (moduleStat.isDirectory) {
			                        fs.readdir(path + '/components/' + file + "/controllers", function (err, controllerFiles) {
				                        if (err) {
				                        	throw err;
				                        }
				                        number_of_component_folders -= 1;
				                        my_number_of_controller_files += controllerFiles.length;
				                        controllerFiles.forEach(function (controllerFile) {
				                        	my_number_of_controller_files -= 1;
				                        	if (controllerFile.substring(0, 1) !== ".") {  
				                        		module = require(path + '/components/' + file + "/controllers/" + controllerFile);
				                        		components.push({name:file, path:path + '/components/' + file + "/controllers/" + controllerFile, module:module});
				                        		module.bootstrap();
				                            } 
				                        	if(my_number_of_controller_files <= 0 && number_of_component_folders <= 0) {
				                        		components_loaded = true;
				                        		if (components_loaded === true && core_loaded === true) { 
				                        			callback(true);
				                        		}
			                        		}
				                        });
			                        });
			                    }
	                      
	                		});
	                	} else {
	                		number_of_component_folders -= 1;
	                	} 
	                });
	            } else {
	            	number_of_component_folders -= 1;
	            }
	        });
		});    
	}; 
  
	that.bootstrap = function (callback) {
		callback = callback || function () {};
		httpApp = express.createServer();
		//httpApp.use(express.logger()); 
		httpApp.use(express.bodyDecoder());
		httpApp.use(express.cookieDecoder());
		httpApp.use(express.session({secret: config.session_secret})); 
		httpApp.use(express.staticProvider(that.getApplicationRoot() + '/public'));
		httpApp.use(express.errorHandler({ showStack: true, dumpExceptions: true }));
		httpApp.use(httpApp.router);  
		
		loadComponents(that.getApplicationRoot(), callback);
		app_host = express.vhost(config.vhost, httpApp);
		vhost_server = express.createServer(app_host); 
	};
	
	that.getComponents = function () {
		return components;
	};
	
	// public functions
	that.getWebServer = function () {
		return vhost_server; // app;
	};
	  
	that.getHttpApp = function () {
	    return httpApp;
	};
	that.getAppHost = function () {
		return app_host;
	};
	that.getConfig = function () {
		return config;
	};
	
	that.getApplicationRoot = function () {
		return __dirname.split('/').slice(0, -1).join("/");
	};
	that.getTemplatePath = function () {
		return that.getApplicationRoot() + "/template/" + that.getConfig().template + "/";
	};
	
	 
	return that;
};

exports = module.exports = application();
