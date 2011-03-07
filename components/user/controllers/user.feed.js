
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
	};
	
	that.bootstrap = function () {  
		usercontroller.bootstrap(); //call parent 
		applications['server'].getHttpApp().get("/feed", that.common, that.getFeed);
		applications['server'].getHttpApp().post("/feed", that.common, that.createPost);
	};
	
	that.getFeed = function (req, res, next) {
		//should be better here - 
		model.bucket('stream').getItems({}, model.getAlphaNumSort('updated', 'desc'), 0, 10, function (err, results) {
			if (err) {
				//throw err;
			}
			res.send(results);
		});
	};
	// TODO: tidy up this and make  it more universal
	// every component, application should be able to bring an own type of feed-story (stream-post)
	// feed = thats what the user gets
	// stream = thats the global thing everybody posts into
	
	that.createPost = function (req, res, next) {
		var post = {};
		
		post.text = req.body.text;
		post.data = {};
		post.data.users = req.body.users.split(',');
		post.data.triggers = req.body.triggers.split(',');
		post.uid = req.user._id;
		post.from = req.user.name;
		post._id = uuid.uuid();
		post.created = new Date().getTime();
		post.updated = new Date().getTime();
		post.trigger_type = req.body.type;  
		model.bucket('stream').saveItem(post, function (err, result) {
			if (err) {
				throw err;
			}
			res.redirect('/home');
		});
	};
	
	return that;
};

exports = module.exports = controller({});