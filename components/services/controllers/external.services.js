
var _ = require("../../../lib/underscore/underscore"),
	webcontroller = require("../../core/controllers/webcontroller"), 
	model = require("../../../lib/sourcegarden/riakmodel"),
	httpcli = require("../../../lib/ext/httpclient"), 
	controller; 

controller = function (spec) {
	var that = _.clone(webcontroller), authenticate,
		viewPath = __dirname.split("/").slice(0, -1).join("/") + "/views/";
	
	
 
	that.bootstrap = function () {  
		webcontroller.bootstrap(); //call parent 
		applications['server'].getHttpApp().get(/^\/services\/([^\\/]\w*)\/(?:(.*))\??/, that.getService);
	};
	
	that.getService = function (req, res, next) {
		model.bucket('apps').getItems({where: {'service_name': req.params[0]}}, model.getAlphaNumSort('name', 'asc'), 0, 100, function (err, app) {
			if (err) {
				throw err;
			}
			if (app && app.length > 0) {
				var result = [], 
					service_params = req.params[1] || "",
					client = new httpcli.httpclient(),
					endpoint = app[0].service_endpoint_uri + "/" + service_params,
					qstring = "",
					qarr = [],
					i;
				for (i in req.query) { 
				    qarr.push(i + "=" + req.query[i]); 
				}
				qstring = "?" + qarr.join("&");
				client.perform(endpoint + qstring, "GET", function (result) {
					try {
						res.send(JSON.parse(result.response.body));
					} catch (e) { 
						res.send(e);
					}
				});
			} else {
				res.send("not found", 404);
			}
		});
	};
	return that;
};

exports = module.exports = controller({});
