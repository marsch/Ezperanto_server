
var dust = require('../../../deps/dust'),
	_ = require("../../../lib/underscore/underscore"),
	usercontroller = require("../../core/controllers/usercontroller"), 
	model = require("../../../lib/sourcegarden/riakmodel"),  
	util = require("util"), 
	controller; 

controller = function (spec) {
	var that = _.clone(usercontroller), authenticate,
		viewPath = __dirname.split("/").slice(0, -1).join("/") + "/views/";

	initGlobalGuiElements = function (req, res) {   
		if(that.hasPermission('is_admin', req)) {
			that.gui.addBlock("parts/mainmenuitem.html", {position: "mainmenu", locals: { caption: "Admin",	link: "/admin",	css: "admin" + ((req.url === "/admin")? " selected": "") }}); 
		}
		
	};
	
	that.bootstrap = function () {
		//okay only admins got access
		that.common = array_merge(usercontroller.common, [that.restrictToPermission('is_admin')]); 
		applications['server'].getHttpApp().get("/admin", that.common, that.showAdmin); 
		that.gui.addListener("init", initGlobalGuiElements); 
		that.loadViews(viewPath); 
	};   
	
	that.showAdmin = function (req, res, next) { 
		that.gui.addContent("admin/admin.html", {locals: {message: that.message(req)}}, function (err, output) {
			if (err) {
				throw err;
			}
			res.send(output);
		});
	};
	return that;
};
exports = module.exports = controller({});