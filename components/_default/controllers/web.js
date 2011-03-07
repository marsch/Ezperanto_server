var dust = require('../../../deps/dust'),
	webcontroller = require("../../core/controllers/webcontroller"),
	_ = require("../../../lib/underscore/underscore"),
	controller;

controller = function (spec) {
	var that = _.clone(webcontroller), error404, error500, 
		viewPath = __dirname.split("/").slice(0, -1).join("/") + "/views/";
	
	error404 = function (req, res) { 
		that.gui.init(req, res);
		req.session.error = "BWAHHHH got 404: "+req.url;  
	    that.gui.addContent("error/404.html", {locals: {message: "404 not found"}, layout: 'layout/splash.html'}, function (err, output) {
			if (err) {
				throw err;
			}
			res.send(output);
		});
	};
	
	error500 = function (err, req, res) {  
	    console.log(err);
	    throw err;
		//that.gui.reset();
	    req.session.error = "500 internal Server-Error!";
	    res.send(req.session.error);
	};
	 
	that.bootstrap = function () {  
		webcontroller.bootstrap();
		
		var mycommon = []; 
		that.common = array_merge(webcontroller.common, mycommon); 
		
		applications['server'].getHttpApp().get("/", that.common, that.start); 
		applications['server'].getHttpApp().use(error404); 
		applications['server'].getHttpApp().error(error500);
		that.loadViews(viewPath, function (err, result) { 
		}); 
	};
	
	
	//overwrite common here?
	that.start = function (req, res, next) {  
		if (req.session.user_id) {
			res.redirect('/user/apps');
	    }
	    else
	    {
	    	res.redirect('/login');
	    }
	};
	return that;
};

exports = module.exports = controller({});