var dust = require('../../../deps/dust'),
	_ = require("../../../lib/underscore/underscore"),
	oauthcontroller = require("../../oauth/controllers/oauth.controller"), 
	controller; 

controller = function (spec) {
	var that = _.clone(oauthcontroller),   
		viewPath = __dirname.split("/").slice(0, -1).join("/") + "/views/";
	

	that.bootstrap = function () {  
		oauthcontroller.bootstrap(); //call parent  
		applications['server'].getHttpApp().get("/api/contacts", that.common, that.restrictToScope(), that.getContacts);
		applications['server'].getHttpApp().put("/api/contacts", that.common, that.restrictToScope(), that.saveContacts);
		
		applications['server'].getHttpApp().get("/api/contacts/:id", that.common, that.restrictToScope(), that.getContact);
		applications['server'].getHttpApp().put("/api/contacts/:id", that.common, that.restrictToScope(), that.saveContact); //do not forget MVVC - vclock
		                       
	};  
	
	that.getContacts = function (req, res, next) {
		res.send("here a list of contacts");
	};
	
	that.getContact = function (req, res, next) {
		res.send("here a single contact with the id:" + req.params.id);  
	};
	 
	that.saveContact = function (req, res, next) {
		res.send("here save a single contact with the id:" + req.params.id);
	};
	
	that.saveContacts = function (req, res, next) {
		res.send("here save a list of contact objects");
	};
	return that;
};

exports = module.exports = controller({});