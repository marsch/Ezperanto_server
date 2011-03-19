var webcontroller = require("../../core/controllers/webcontroller"), 
	_ = require("../../../lib/underscore/underscore"),
	model = require("../../../lib/sourcegarden/riakmodel"),  
	sigReq = require("../../../lib/sourcegarden/signedrequest.js");
	
controller = function (spec) {
	var that = _.clone(webcontroller);


	var doUserProvision = function (username, password, cb) {
		//check if user exists
		model.bucket('users').getItems({where: {name: username}}, model.getAlphaNumSort('name', 'asc'), 0, 1, function (err, users) {
			if (!users[0] || users.length === 0) {
				//create user if not exists
			} else {
				//update user password if exist
			} 
		});
	}


	var doAutoProvisioning = function (options) {
		doUserProvision(options.username, options.password, function (err, user) {
			if(err) {
				throw "error during provisioning user:"+options.username;
			}
			
			//load all apps
			model.bucket('apps').getItems({}, model.getAlphaNumSort('updated', 'desc'), 0, 10, function (err, apps) {
				if (err) {
					throw err;
				}
				var installedApps = [],
				 	appsToInstall = [], 
					i;
				if (!user.apps) {
					user.apps = [];	
				}
				for (i = 0; i < apps.length; i += 1) {
					if (user.apps.join().indexOf(apps[i]._id) >= 0) {
						installedApps.push(apps[i]);
					} else {
						appsToInstall.push(apps[i]);
					}
				}
				console.log(installedApps);
				console.log(appsToInstall);
			 
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
                console.log(data.toString("utf8"));
                console.log(decoded);
				res.send({success:true});
        });
	};
 
	
	return that;
};
exports = module.exports = controller({});