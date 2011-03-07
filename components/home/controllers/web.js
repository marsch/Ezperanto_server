
var dust = require('../../../deps/dust'),
	_ = require("../../../lib/underscore/underscore"),
	usercontroller = require("../../core/controllers/usercontroller"), 
	model = require("../../../lib/sourcegarden/riakmodel"),   
	controller; 

controller = function (spec) {
	var that = _.clone(usercontroller), authenticate,
		viewPath = __dirname.split("/").slice(0, -1).join("/") + "/views/";
	
	
	initGlobalGuiElements = function (req, res) { 
 
		that.gui.addBlock("parts/mainmenuitem.html", {position: "mainmenu", locals: { caption: "Home", link: "/home",	css: "feed" + ((req.url === "/home")? " selected": "")} });
	};
	
	that.bootstrap = function () {  
		usercontroller.bootstrap(); //call parent 
		
		that.gui.addListener("init", initGlobalGuiElements);
		
		applications['server'].getHttpApp().get("/home", that.common, that.showHome);
		that.loadViews(viewPath, function (err, result) {
			 
		});  
	}; 
	
 

	that.showHome = function (req, res, next) {
		
		that.gui.addContent("home/home.html", {locals: {message: that.message(req)}}, function (err, output) {
			if (err) {
				throw err;
			}
			res.send(output);
		});
	};
	return that;
};

exports = module.exports = controller({});