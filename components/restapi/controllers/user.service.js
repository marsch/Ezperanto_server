var dust = require('dust'),
	_ = require("../../../lib/underscore/underscore"),
	oauthcontroller = require("../../oauth/controllers/oauth.controller"), 
	controller; 

controller = function (spec) {
	var that = _.clone(oauthcontroller),   
		viewPath = __dirname.split("/").slice(0, -1).join("/") + "/views/";
	

	that.bootstrap = function () {  
		oauthcontroller.bootstrap(); //call parent  
		applications['server'].getHttpApp().get("/api/user", that.common, that.restrictToScope(), that.getLdapCredentials); 
	};  
	
	that.getLdapCredentials = function (req, res, next) {
		res.send(req.access_token.user);
	};
	
	return that;
};

exports = module.exports = controller({});
