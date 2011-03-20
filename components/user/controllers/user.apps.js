
var dust = require('dust'),
	_ = require("../../../lib/underscore/underscore"),
	usercontroller = require("../../core/controllers/usercontroller"), 
	model = require("../../../lib/sourcegarden/riakmodel"),  
	uuid = require("../../../lib/sourcegarden/uuid"),
	sigReq = require('../../../lib/sourcegarden/signedrequest'),  
	controller; 

controller = function (spec) {
	var that = _.clone(usercontroller), authenticate,
		viewPath = __dirname.split("/").slice(0, -1).join("/") + "/views/";
	
	
	initGlobalGuiElements = function (req, res) {
	};
	
	that.bootstrap = function () {  
		usercontroller.bootstrap(); //call parent  
		
		applications['server'].getHttpApp().get("/user/apps", that.common, that.showUserAppsPage);
		applications['server'].getHttpApp().get("/user/apps/myapps/search", that.common, that.getUsersApps);
		applications['server'].getHttpApp().get("/user/apps/myapps/show/:id", that.common, that.showUserApp); 
		applications['server'].getHttpApp().get("/user/apps/available/search", that.common, that.getAvailableApps);
		applications['server'].getHttpApp().get("/user/apps/available/show/:id", that.common, that.showAvailableApp); 
		applications['server'].getHttpApp().get("/user/apps/recommended/search", that.common, that.getAvailableApps); // same as available for now

	};
	
	that.showUserAppsPage = function (req, res, next) {
		that.gui.addContent("user/apps.html", {locals: {message: that.message(req)}}, function (err, output) {
			if (err) {
				throw err;
			} 
			res.send(output);
		});
	};
	
	that.getUsersApps = function (req, res, next) {
		model.bucket('apps').getItems({}, model.getAlphaNumSort('updated', 'desc'), 0, 10, function (err, results) {
			if (err) {
				throw err;
			}
			var showApps = [], i;
			if (!req.user.apps) {
				req.user.apps = [];	
			}
			for (i = 0; i < results.length; i += 1) {
				if (req.user.apps.join().indexOf(results[i]._id) >= 0) {
					showApps.push(results[i]);
				}
			}
			res.send({'results': showApps});
		}); 
	};
	
	that.showUserApp = function (req, res, next) {
		model.bucket('apps').getItem(req.params.id, function (err, result) {
			if (err) {
				throw err;
			}
			model.bucket('accessTokens').getItems({where: {user_id: req.user._id}}, model.getAlphaNumSort('expires', 'desc'), 0, 10, function (err, accessTokens) {
				if (err) {
					throw err;
				}
				var shared_data = {}, 
					signed_request, 
					iframe_uri;
				
				if (accessTokens && accessTokens.length > 0) {
					if ((Math.round(new Date().getTime()) - accessTokens[0].expires) < 0) {
						//ohh expired
					} else {
						shared_data.access_token = accessTokens[0].access_token;
						shared_data.expires = accessTokens[0].expires;
						shared_data.scope = accessTokens[0].scope;
					}
				}
				shared_data.user_id = req.user._id;
				signed_request = sigReq.encode(shared_data, result.application_secret);
				iframe_uri = result.config_uri + ((result.config_uri.indexOf('?') > 0) ? ("&") : ("?")) + "signed_request=" + signed_request;
				that.gui.addContent("user/externalappconfig.html", {locals: {message: that.message(req), app: result, appIframeUri: iframe_uri}, layout: 'layout/openbox.html'}, function (err, output) {
					if (err) {
						throw err;
					} 
					res.send(output);
				}); 
			});
		});
	};
	
	that.getAvailableApps = function (req, res, next) {
		model.bucket('apps').getItems({}, model.getAlphaNumSort('updated', 'desc'), 0, 10, function (err, results) {
			if (err) {
				throw err;
			}
			var showApps = [], 
							i;
			//init apps
			if (!req.user.apps) {
				req.user.apps = [];
			}
			
			for (i = 0; i < results.length; i += 1) {
				//show the apps the user hasn't
				if (req.user.apps.join().indexOf(results[i]._id) === -1) {
					showApps.push(results[i]);
				}
			}
			res.send({results: showApps});
		});
	};
	
	that.showAvailableApp = function (req, res, next) {
		model.bucket('apps').getItem(req.params.id, function (err, result) {
			if (err) {
				throw err;
			}
			that.gui.addContent("user/app.html", {locals: {message: that.message(req), app: result}, layout: 'layout/openbox.html'}, function (err, output) {
				if (err) {
					throw err;
				} 
				res.send(output);
			}); 
		});
	};
		 
	
	return that;
};

exports = module.exports = controller({});
