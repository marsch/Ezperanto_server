require("../../../lib/utils/utils"); 

var webcontroller = require("./webcontroller"),
	_ = require("../../../lib/underscore/underscore"),
	model = require("../../../lib/sourcegarden/riakmodel"),
	controller;


controller = function (spec) {
	var that = _.clone(webcontroller); 
	
	that.restrictToLoggedInUser = function (req, res, next) {   
		console.log("user????");
		console.log(req.session);	
		if (req.session.user_id) { 
			if (req.session.user_id === "SUPERUSER") {
				var user = {};
				user.name = applications['server'].getConfig().superuser;
				user._id = "SUPERUSER";
				user.permissions = ["is_admin"];
				req.user = user;
				that.gui.init(req, res);
				next(false, user);
				
			} else { 
				model.bucket('users').getItem(req.session.user_id, function (err, user) {  
					if (err) {
						throw err;
					}
					req.user = user;
					that.gui.init(req, res); //init again (naja.....) wack 
					next(err, user);
				});
			}
		}
		else { 
			console.error("No active user session found. Please login.");
		    req.session.error = 'No active user session found. Please login.'; 
		    res.redirect('/login');
		}  
	};
	
	that.isActiveUser = function (req) { 
		return (req.user && req.session.user_id);
	};
	
	that.hasPermission = function (perm, req) {
		if (req.user && req.user.permissions) {
    		for (var i in req.user.permissions) {  
	            if (req.user.permissions[i] === perm) {   
	            	return true;
	            }
	        }
		} 
		return false;
	};
	that.restrictToPermission = function (perm) {
        return function (req, res, next) {  
        	if (req.user && req.user.permissions) {
        		for (var i in req.user.permissions) {  
    	            if (req.user.permissions[i] === perm) {   
    	            	next();
    	            	return true;
    	            }
    	        }
    		} 
            console.error("not found so access denied");
            req.session.error = "Access denied";
            res.redirect('/');
        };
    };
	
	that.bootstrap = function () { 
		var mycommon = [];
		mycommon.push(that.restrictToLoggedInUser); 
		that.common = mycommon; //no merging here; 
	};
	return that;
}; 
exports = module.exports = controller({});
