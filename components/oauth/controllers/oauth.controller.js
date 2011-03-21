require("../../../lib/utils/utils"); 

var webcontroller = require("../../core/controllers/webcontroller"),
	_ = require("../../../lib/underscore/underscore"), 
	oauthmodel = require("../lib/oauth.model"),  
	oautherrors = require("../lib/oauth.errors"),
	controller;


controller = function (spec) {
	var that = _.clone(webcontroller);

	function hasSufficientScope(scopes_wanted, access_token) { 
		
		for (var i in scopes_wanted) {
			if (!_.isArray(access_token.scope) || (_.indexOf(access_token.scope, scopes_wanted[i]) < 0)) {
				//damn scope doesn't match - error
				return false;
			}
		}
		return true;
	}

	that.restrictToScope = function (scope) {
		var scopes_wanted;
		scope = scope || "general";
		scopes_wanted = scope.split(",");
		return function (req, res, next) { 
			var token = req.query.access_token || false;
			if (token === false) {
				return res.send(oautherrors.token_validation_errors.invalid_request);
			}
			oauthmodel.get_access_token(token, function (err, access_token) {
				if (err || !access_token) {
					return res.send(oautherrors.token_validation_errors.invalid_token);
				}
				if ((Math.round(new Date().getTime()) - access_token.expires) < 0) {
					//so access_code is expired
					return res.send(oautherrors.token_validation_errors.invalid_token);
				} else {
					if (!hasSufficientScope(scopes_wanted, access_token)) {
						return res.send(oautherrors.token_validation_errors.insufficient_scope);
					}  
					oauthmodel.get_user(access_token.user_id, function (err, user) { 
						if (err) {
							return res.send(oautherrors.token_validation_errors.invalid_token);
						}
						access_token.isValid = true;
						req.access_token = access_token;
						req.access_token.user = user;
						
						console.log(req);
						return next();
					});

					 //okay valid so go next
				}
			});
		};
	};
	
	that.verifyAccessToken = function (req, res, next) { 
		var scope = req.query.scope || "general",
			get_token = req.query.get_token || false;
	    scope = scope.split(",");
	    if (req.access_token.isValid) {
	        if (hasSufficientScope(scope, req.access_token)) { 
	        	if (get_token) {
		
					console.log("HERE");
	        		return res.send({result: req.access_token});
	        	} else {
		
					console.log("HERE");
		           return  res.send({result: true}); 
	        	}
	        }
	    } 
		return res.send({result: false});
		
		
		console.log("THERE");
	    
	};
	
	that.bootstrap = function () {
		applications['server'].getHttpApp().get("/verify_access_token", that.common, that.restrictToScope(), that.verifyAccessToken);
	};
	return that;
}; 
exports = module.exports = controller({});