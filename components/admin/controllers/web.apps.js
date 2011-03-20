var dust = require('dust'),
	_ = require("../../../lib/underscore/underscore"),
	usercontroller = require("../../core/controllers/usercontroller"), 
	model = require("../../../lib/sourcegarden/riakmodel"),  
	util = require("util"),
	uuid = require("../../../lib/sourcegarden/uuid"),
	crypto = require("crypto"),
	controller; 

controller = function (spec) {
	var that = _.clone(usercontroller), authenticate,
		viewPath = __dirname.split("/").slice(0, -1).join("/") + "/views/";


	
	that.bootstrap = function () {   
		that.common = array_merge(usercontroller.common, [that.restrictToPermission('is_admin')]);
		
		applications['server'].getHttpApp().get("/admin/apps/create", that.common, that.getCreateApp);
		applications['server'].getHttpApp().post("/admin/apps/create", that.common, that.doCreateApp);
		applications['server'].getHttpApp().get("/admin/apps/search", that.common, that.getAppList);
		applications['server'].getHttpApp().get("/admin/apps/show/:id", that.common, that.getShowApp);
		applications['server'].getHttpApp().post("/admin/apps/edit/:id", that.common, that.doEditApp);
		applications['server'].getHttpApp().get("/admin/apps/delete/:id", that.common, that.getDeleteApp);
		applications['server'].getHttpApp().post("/admin/apps/delete/:id", that.common, that.doDeleteApp);
	}; 
	
	that.getCreateApp = function (req, res, next) {
		that.gui.addContent("admin/createapp.html", {locals: {message: that.message(req)}, layout: "layout/openbox.html"}, function (err, output) {
			if (err) {
				throw err;
			}
			res.send(output);
		});
	};
	
	that.doCreateApp = function (req, res, next) {
		var date = new Date(),
			myApp = {}, secretStr;
		myApp.name = req.body.name;
		myApp.type = "application";
		myApp.description = req.body.description;
		myApp._id = uuid.uuid();
		
		secretStr = myApp.name + myApp._id + (date.getTime().toString(36)) + ((Math.round(46656 * 46656 * 46656 * 36 * Math.random())).toString(36));
		myApp.application_secret = crypto.createHash('md5').update(secretStr).digest('hex');
		
		model.bucket('apps').saveItem(myApp, function (err, result) {
			if (!err) {
	            req.session.success = "Successfully created the app";
	        }
	        else {
	            req.session.error = "Something went wrong";
	        }
			res.redirect('/admin');
		});
	};
	
	that.getAppList = function (req, res, next) {
		model.bucket('apps').getItems({}, model.getAlphaNumSort('name', 'asc'), 0, 100, function (err, result) {
			if (err) {
				throw err;
			} 
			res.send({'results': result});
		});
	};
	
	that.getShowApp = function (req, res, next) {
		model.bucket('apps').getItem(req.params.id, function (err, result) {
			if (err) {
				throw err;
			}
			that.gui.addContent("admin/showapp.html", {locals: {message: that.message(req), app: result}, layout: "layout/openbox.html"}, function (err, output) {
				if (err) {
					throw err;
				}
				res.send(output);
			});
		});
	};
	
	that.doEditApp = function (req, res, next) {
		model.bucket('apps').getItem(req.params.id, function (err, result) {
			if (err) {
				throw err;
			}
			//FIXME: dangerous must be filtered here
			result[req.body.field] = req.body.value;
			model.bucket('apps').saveItem(result, function (err, result) {
				if (err) {
					throw err;
				}
				res.send({success: true});
			});
		});
	};
	that.getDeleteApp = function (req, res, next) {
		that.gui.addContent("dialogs/deleteobject.html", {locals: {message: that.message(req), 'commit_url': req.url, 'object_id': req.params.id}, layout: "layout/openbox.html"}, function (err, output) {
			if (err) {
				throw err;
			}
			res.send(output);
		});
	};
	
	that.doDeleteApp = function (req, res, next) {
		model.bucket('apps').deleteItem(req.params.id, function (err, result) {
			if (err) {
				throw err;
			}
			res.send({success: true});
		});
	};
	
	return that;
};
exports = module.exports = controller({});
