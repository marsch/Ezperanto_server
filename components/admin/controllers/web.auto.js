var webcontroller = require("../../core/controllers/webcontroller"), 
	_ = require("../../../lib/underscore/underscore"),
	model = require("../../../lib/sourcegarden/riakmodel"),  
	sigReq = require("../../../lib/sourcegarden/signedrequest.js"),
	uuid = require("../../../lib/sourcegarden/uuid"),
	oauthmodel = require("../../oauth/lib/oauth.model"),  
	chain = require("slide").chain,
	http = require('http'),
	url = require("url"),
	crypto = require('crypto');
	
controller = function (spec) {
	var that = _.clone(webcontroller);


	var doCreateNewUser = function (username, password, callback) {
		var date = new Date(),
			myUser = {}, secretStr;
		
		myUser.name = username;
	//	myUser.email = req.body.email;
		myUser._id = uuid.uuid();
		
		secretStr = myUser.name + myUser._id + (date.getTime().toString(36)) + ((Math.round(46656 * 46656 * 46656 * 36 * Math.random())).toString(36));
		myUser.salt = crypto.createHash('md5').update(secretStr).digest('hex');
		myUser.pass = crypto.createHash('md5').update(password + myUser.salt).digest('hex');
		model.bucket('users').saveItem(myUser, function (err) {
            if (err) {
				return callback(err, null);
			}
			callback(null, myUser);
		});
	}

	var doUpdateUser = function (userid, password, cb) {
		model.bucket('users').getItem(userid, function (err, user) {
			if (err) {
				return cb(err, null);
			}
			crypto.createHash('md5').update(password + user.salt).digest('hex');
			model.bucket('users').saveItem(user, function (err, result) {
				if (err) {
					return cb(err,null);
				}
				cb(null, user);
			});
		});	
	};

	var doUserProvision = function (username, password, cb) {
		//check if user exists
		console.log("doUserProvision");
		model.bucket('users').getItems({where: {name: username}}, model.getAlphaNumSort('name', 'asc'), 0, 1, function (err, users) {
			if (err) {
				return cb(err, null);
			}
			if (!users[0] || users.length === 0) {
				//create user if not exists
				console.log("create new user");
				doCreateNewUser(username, password, cb);
			} else {
				//update user password if exist
				console.log("update existing user");
				doUpdateUser(users[0]._id, password, cb);
			} 
		});
	};
	
	that.sendConfigurationMessage = function (message, app, callback) { 
		var encodedMessage = sigReq.encode(message, app.application_secret),
			address = url.parse(app.config_uri);
		
		address.port = address.port || 80; //set the default port TODO: read out of the config-file
			
		var	client = http.createClient(address.port, address.hostname),
			request;
		
		request = client.request("PUT", address.pathname, {'host': address.hostname});
		request.end(encodedMessage);
		request.on('response', function (response) {
			var data = "";
			response.setEncoding('utf8');
			response.on('data', function (chunk) {
				data += chunk; 
			});
			response.on('end', function () { 
				try {
					var res = JSON.parse(data);
					if (res.success) {
						callback(null, true);
					} else {
						callback("resonse from "+app.config_uri+" was invalid");
					}
				} catch (e) {
					callback("resonse from "+app.config_uri+" was invalid");
				}
			});
		 
		});
		console.log("PUT "+app.config_uri+ " body:"+encodedMessage);  
	
	};
	
	that.doUpdateApplication = function (user, app, options, callback) {
		//just create a new access_token - TODO: remove existing tokens for that app and user before
		that.removeExistingTokens(user._id, app._id, function (err, result1) {
			if(err) {
				return callback(err, null);
			}
			oauthmodel.create_access_token (app._id, ["general","ox_user_contacts","ox_user_calendar"], user._id, function (err, token) {
				if (err) {
					return callback(err, null); 
				}
				var configurationMessage = {};
				configurationMessage.token = token;
				configurationMessage.user = user;
				configurationMessage.options = options;
				configurationMessage.mode = "update";
				that.sendConfigurationMessage(configurationMessage, app, callback);
			});
		});

	};
	
	//AUTO PROVISIONING METHODS
	that.removeExistingTokens = function (user_id, client_id, callback) {
		model.bucket('accessTokens').getItems({where: {user_id: user_id, client_id:client_id}, meta: true}, model.getAlphaNumSort('updated', 'desc'), 0, 10, function (err, data) {
			var todelete = [],
				i;
			for (i = 0; i < data.length; i++) {
				todelete.push([model.bucket('accessTokens'), "deleteItem", data[i].data._id]);
			} 
			console.log(todelete);
			chain(todelete, function (err) {
				if (err) { 
					return callback(err, null);
				}
				return callback(null, true);
			});
		});
	};
	
	that.doInstallApplication = function (user, app, options, callback) {
		if (!user.apps) {
			user.apps = [];	
		};
		user.apps.push(app);
		console.log("SAVING USER APPS"); 
		console.log("====================");
		model.bucket('users').saveItem(user, function (err, result) {
			if (err) {
				return cb(err,null);
			}
			//okay now create acccessToken
			that.removeExistingTokens(user._id, app._id, function (err, result1) {
				if(err) {
					return cb(err, null);
				}
				oauthmodel.create_access_token (app._id, ["general","ox_user_contacts","ox_user_calendar"] /*TODO: make this configurable*/, user._id, function (err, token) {
					if (err) {
						return callback(err, null); 
					}
					var configurationMessage = {};
					configurationMessage.token = token;
					configurationMessage.user = user;
					configurationMessage.options = options;
					configurationMessage.mode = "create"; 
					that.sendConfigurationMessage(configurationMessage, app, callback);
				});
			}); 
		});
	};


	var doAutoProvisioning = function (options, cb) {
		doUserProvision(options.username, options.password, function (err, user) {
			if(err) {
				throw "error during provisioning user:"+options.username;
			} 
			//load all apps
			model.bucket('apps').getItems({}, model.getAlphaNumSort('updated', 'desc'), 0, 10, function (err, apps) {
				if (err) {
					return  cb(err, null);
				}
				var installedApps = [],
				 	appsToInstall = [], 
					i;
				if (!user.apps) {
					user.apps = [];	
				}
				for (i = 0; i < apps.length; i += 1) {   
					//NAJA !??!
					if (JSON.stringify(user.apps).indexOf(apps[i]._id) >= 0) {
						installedApps.push(apps[i]);
					} else {
						appsToInstall.push(apps[i]);
					}
				}
				
				var todo = [],
				 	i;
				for (i = 0; i < installedApps.length; i++) {
					// i know this could be better
					todo.push([that, "doUpdateApplication", user, installedApps[i], options]);
				}
				
				for (i = 0; i < appsToInstall.length; i++) {
					todo.push([that, "doInstallApplication", user, appsToInstall[i], options]);
				}
				 
				
				var res = [];
				chain(todo, res, function (err, results) {
					if (err) {
						return cb(err, null);
					}
					return cb(null, true); 
				});
			});
		});
		
		//check if user got all autoprov apps
			//if not add all autoprov apps
				//configure each app with user credentials as default,
				//by sending a signed request to the app,
				//try to do not by-pass the oauth
			//if yes
				//refresh the access_tokens for each app,
				//by sending a signed requests to the app
				//try to do not by-pass the oauth
	};


	
	that.bootstrap = function () {    
		applications['server'].getHttpApp().put("/admin/tools/autoprovision", that.doAutoProvision);  
	}; 
	
	that.doAutoProvision = function (req, res) {
		console.log("START AUTOPROVISIONING"); 
		var data = '';
        req.on("data", function (chunk) {
                data +=chunk;
        });
        req.on("end", function () {
                var decoded = sigReq.decode(data, applications['server'].getConfig().application_secret, false /*@FIXIT: do not validate*/);
                //console.log(data.toString("utf8"));
                doAutoProvisioning(decoded, function (err, result) {
					if (err) {
						throw err;
					} 
					res.send({success:true});
				});


			
        });
	};
	
	 
 
	
	return that;
};
exports = module.exports = controller({});