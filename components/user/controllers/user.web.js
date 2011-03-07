
var dust = require('../../../deps/dust'),
	_ = require("../../../lib/underscore/underscore"),
	usercontroller = require("../../core/controllers/usercontroller"), 
	model = require("../../../lib/sourcegarden/riakmodel"),  
	uuid = require("../../../lib/sourcegarden/uuid"), 
	controller; 

controller = function (spec) {
	var that = _.clone(usercontroller), authenticate,
		viewPath = __dirname.split("/").slice(0, -1).join("/") + "/views/";
	
	
	initGlobalGuiElements = function (req, res) {
 
		if (that.isActiveUser(req)) {
			that.gui.addBlock("parts/userlogoutitem.html", {position: "usermenu", locals: {user: req.user}});
			
			//that.gui.addBlock("parts/usermenuitem.html", {position: "usermenu", locals: {caption: "Profile", link: "/user/profile/edit", css: "editprofile"}});
			that.gui.addBlock("parts/usermenuitem.html", {position: "usermenu", locals: {caption: "Applications", link: "/user/apps", css: "settings"}});
			//that.gui.addBlock("parts/usermenuitem.html", {position: "usermenu", locals: {caption: "Settings", link: "/user/settings", css: "settings"}});
			//that.gui.addBlock("parts/usermenuitem.html", {position: "usermenu", locals: {caption: "Feedback", link: "/app/feedback", css: "feedback"}});
		}
	};
	
	that.bootstrap = function () {  
		usercontroller.bootstrap(); //call parent 
		
		that.gui.addListener("init", initGlobalGuiElements); 
		that.loadViews(viewPath);
	};
	return that;
};

exports = module.exports = controller({});