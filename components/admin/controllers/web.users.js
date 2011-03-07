var dust = require('../../../deps/dust'),
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
		 
		applications['server'].getHttpApp().get("/admin/users/create", that.common, that.getCreateUser);
		applications['server'].getHttpApp().post("/admin/users/create", that.common, that.doCreateUser);
		applications['server'].getHttpApp().get("/admin/users/search", that.common, that.getUserList);
		applications['server'].getHttpApp().get("/admin/users/show/:id", that.common, that.getShowUser);
		applications['server'].getHttpApp().post("/admin/users/edit/:id", that.common, that.doEditUser);
		applications['server'].getHttpApp().get("/admin/users/delete/:id", that.common, that.getDeleteUser);
		applications['server'].getHttpApp().post("/admin/users/delete/:id", that.common, that.doDeleteUser);
	}; 

	that.getCreateUser = function (req, res, next) {
		that.gui.addContent("admin/createuser.html", {locals: {message: that.message(req)}, layout: "layout/openbox.html"}, function (err, output) {
			if (err) {
				throw err;
			}
			res.send(output);
		});
	};
	
	that.doCreateUser = function (req, res, next) {
		model.bucket('users').getItems({where: {'name': req.body.name}}, model.getAlphaNumSort('name', 'asc'), 0, 1, function (err, result) {
			if (result !== null && result.length > 0) {
				req.session.error = 'Sorry, this username is already in use';
				req.redirect('back');
			} else {
				var date = new Date(),
					myUser = {}, secretStr;
				
				myUser.name = req.body.name;
				myUser.email = req.body.email;
				myUser._id = uuid.uuid();
				
				secretStr = myUser.name + myUser._id + (date.getTime().toString(36)) + ((Math.round(46656 * 46656 * 46656 * 36 * Math.random())).toString(36));
				myUser.salt = crypto.createHash('md5').update(secretStr).digest('hex');
				myUser.pass = crypto.createHash('md5').update(req.body.password + myUser.salt).digest('hex');
				model.bucket('users').saveItem(myUser, function (err, result) {
	                if (!err) {
	                    req.session.success = "Successfully created the user";
	                }
	                else {
	                    req.session.error = "Something went wrong";
	                }
	                res.redirect('/admin'); 
				});
			}
		});
	};
	
	that.getUserList = function (req, res, next) {
		model.bucket('users').getItems({}, model.getAlphaNumSort('name', 'asc'), 0, 100, function (err, result) {
			if (err) {
				throw err;
			} 
			res.send({'results': result});
		});
	};
	
	that.getShowUser = function (req, res, next) {
		model.bucket('users').getItem(req.params.id, function (err, result) {
			if (err) {
				throw err;
			}
			that.gui.addContent("admin/showuser.html", {locals: {message: that.message(req), user: result}, layout: "layout/openbox.html"}, function (err, output) {
				if (err) {
					throw err;
				}
				res.send(output);
			});
		});
	};
	
	that.doEditUser = function (req, res, next) {
		model.bucket('users').getItem(req.params.id, function (err, result) {
			if (req.body.field === "pass") {
				req.body.value = crypto.createHash('md5').update(req.body.value + result.salt).digest('hex');
			} else if (req.body.field === "permissions") {
				req.body.value = req.body.value.split(",");
			}
			result[req.body.field] = req.body.value;
			
			model.bucket('users').saveItem(result, function (err) {
				if (err) {
					throw err;
				}
				res.send({success: true});
			});
		});
	};
	
	that.getDeleteUser = function (req, res, next) {
		that.gui.addContent("dialogs/deleteobject.html", {locals: {message: that.message(req), 'commit_url': req.url, 'object_id': req.params.id}, layout: "layout/openbox.html"}, function (err, output) {
			if (err) {
				throw err;
			}
			res.send(output);
		});
	};
	
	that.doDeleteUser = function (req, res, next) {
		model.bucket('users').deleteItem(req.params.id, function (err, result) {
			if (err) {
				throw err;
			}
			res.send({success: true});
		});
	};
	
	
	
	return that;
};
exports = module.exports = controller({});