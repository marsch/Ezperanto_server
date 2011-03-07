var _ = require("../../../lib/underscore/underscore"),
	oauthcontroller = require("../../oauth/controllers/oauth.controller"), 
	uuid = require("../../../lib/sourcegarden/uuid"),
	controller; 

controller = function (spec) {
	var that = _.clone(oauthcontroller); 

	that.bootstrap = function () {  
		oauthcontroller.bootstrap(); //call parent  
		applications['server'].getHttpApp().get("/api/stream", that.common, that.restrictToScope(), that.getFullStream); 
		applications['server'].getHttpApp().post("/api/stream", that.common, that.restrictToScope(), that.publishToStream);
	};  
	
	that.getFullStream = function (req, res) {
		res.send("nope not implemented for now");
	};
	/**
	 * With that function developers are enabled to publish to the Stream in the behalf of a User.
	 * Some usecases:
	 * 
	 * Notification
	 * A notifcation about a missed call, an important email, an important event.
	 * Actions would be used to offer quick actions according to that notification.
	 * (p.e.: recall a missed call, read that email, subscribe to an event, etc.)
	 * 
	 * Status-Updates
	 * A Message that is entered by the user himself. The user can post Links, Media (Video, Images)
	 * and is also able to mention people and any other entity within the ezperanto universe
	 * 
	 */
	that.publishToStream = function (req, res) {
		var post = {};
		post.id = uuid.uuid();
		post.from = {id: req.access_token.user, name: "Hanstester"};
		post.to = {data: [{id: uuid.uuid(), name: "Entity name", type: "?human, entities blah"}]};
		post.message = "hello i am tha message";
		post.picture = "ezperantolink to shrinked image";
		post.link = "http://www.hauptlink";
		post.link_name = "name des links";
		post.link_caption = "caption des links";
		post.link_description = "description of the posted link";
		post.media_source = "source of the embedded media (swf, audio, video)";
		post.icon = "icon of the post - link";
		post.attribution = "String to indicate where the message came from, or which application created that entry";
		post.actions = [{name: "action1", link: "action_link1"}, {name: "action2", link: "action_link2"}];
		post.privacy = {value: "PRIVSTRING"}; //ausforlmulieren
		post.created_time = new Date().getTime();
		post.updated_time = new Date().getTime();
		post.targeting = {}; //string that defines the targeting of that post
		console.log(req.params);
		res.send(post);
	};
	
	return that;
};

exports = module.exports = controller({});