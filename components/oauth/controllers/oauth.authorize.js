var dust = require('dust'),
	_ = require("../../../lib/underscore/underscore"),
	usercontroller = require("../../core/controllers/usercontroller"), 
	oauthmodel = require("../lib/oauth.model"),  
	oautherrors = require("../lib/oauth.errors"), 
	controller; 

controller = function (spec) {
	var that = _.clone(usercontroller),  
		ensureParams,
		authorize_redirect,
		viewPath = __dirname.split("/").slice(0, -1).join("/") + "/views/";
	
	authorize_redirect = function (res, redirect_uri, params) { 
		var qstring = [], i, redirurl;
		for (i in params) {
			qstring.push(i + "=" + params[i]);
		}
		
		redirurl = redirect_uri + "?" + qstring.join("&"); 
		res.redirect(redirurl); 
	};
	
	ensureParams = function (req, res, next) {
		var params, oauth_params = {};
		
		if (req.query.response_type) {
			params = req.query;
		} else {
			params = req.session;
		}
		
		oauth_params.response_type = params.response_type || false;
		oauth_params.client_id = params.client_id || false;
		oauth_params.redirect_uri = params.redirect_uri || false;
		oauth_params.scope = (params.scope) ? (params.scope.split(",")) : ([]);
		if (!(("|" + oauth_params.scope.join("|") + "|").indexOf('|general|') >= 0)) {
			oauth_params.scope.push('general'); //default
		}
		oauth_params.state = params.state || ""; //is optional
		
	    if (!oauth_params.response_type || !oauth_params.client_id || !oauth_params.redirect_uri) {
	        res.send(oautherrors.auth_errors.invalid_request);
	    } else if (oauth_params.response_type !== "token" && oauth_params.response_type !== "code" && oauth_params.response_type !== "code_and_token") {
	        //may be there are fewer supported types
	        res.send(oautherrors.auth_errors.unsupported_response_type);
	    }
		
	    oauthmodel.get_client(oauth_params.client_id, function (err, client) {
	    	if (err) {
	    		res.send(oautherrors.auth_errors.invalid_client);
	    	} else {
	    		if (client.auth_redirect_uri !== oauth_params.redirect_uri) {
	    			res.send(oautherrors.auth_errors.redirect_uri_mismatch);
	    		} else {
	    			oauthmodel.get_available_scopes(function (err, available_scopes) {
	    				oauth_params.scope_to_ask_for = [];
		                for (var i in oauth_params.scope) {
		                    if (oauth_params.scope[i] in available_scopes) {
		                    	oauth_params.scope_to_ask_for.push(available_scopes[oauth_params.scope[i]]);
		                    }
		                    else {
		                        res.send(oautherrors.auth_errors.invalid_scope); 
		                    }
		                }
		                req.oauth_params = oauth_params;
		                req.oauth_params.client = client;
		                
		                delete req.oauth_params.client.application_secret;
		        		delete req.user.password;
		        		delete req.user.salt;
		        		 
		                next();
	    			}); 
	    		}
	    	}
	    });
	 
	};
	
	that.bootstrap = function () {  
		usercontroller.bootstrap(); //call parent  
		applications['server'].getHttpApp().get("/authorize", that.common, ensureParams, that.authorize);
		applications['server'].getHttpApp().post("/authorize", that.common, ensureParams, that.finish_authorize);
		that.loadViews(viewPath);
	}; 
	
 
	/**
	 *
	 * @description SECTION 4.1 Draft 11
	 * In order to direct the end-user's user-agent to the authorization server, 
	 * the client constructs the request URI by adding the following parameters 
	 * to the end-user authorization endpoint URI query component using the 
	 * application/x-www-form-urlencoded format as defined by 
	 * [W3C.REC‐html401‐19991224]:
	 * 
	 * @param response_type REQUIRED. The requested response: an access token, 
	 * an authorization code, or both. The parameter value MUST be set to token 
	 * for requesting an access token, code for requesting an authorization code, 
	 * or code_and_token to request both. The authorization server 
	 * MAY decline to provide one or more of these response types.
	 * 
	 * @param client_id REQUIRED. The client identifier as described in Section 3.
	 * 
	 * @param redirect_uri REQUIRED, unless a redirection URI has been 
	 * established between the client and authorization server via other means. 
	 * An absolute URI to which the authorization server will redirect the 
	 * user-agent to when the end-user authorization step is completed. 
	 * The authorization server SHOULD require the client to 
	 * pre-register their redirection URI.
	 * 
	 * @param scope OPTIONAL. The scope of the access request expressed as a 
	 * list of space-delimited strings. The value of the scope parameter is 
	 * defined by the authorization server. If the value contains multiple space- 
	 * delimited strings, their order does not matter, and each string adds an 
	 * additional access range to the requested scope.
	 * 
	 * @param state OPTIONAL. An opaque value used by the client to maintain 
	 * state between the request and callback. The authorization server includes 
	 * this value when redirecting the user-agent back to the client.
	 */
	that.authorize = function (req, res, next) { 
        req.session.response_type = req.oauth_params.response_type;
        req.session.client_id = req.oauth_params.client_id;
        req.session.redirect_uri = req.oauth_params.redirect_uri;
        req.session.scope = req.oauth_params.scope.join(',');
        req.session.state = req.oauth_params.state; 
        
		that.gui.addContent("authorize/authorize.html", {locals: {message: that.message(req), app: req.oauth_params.client, user: req.user, scopes: req.oauth_params.scope_to_ask_for }, layout: "layout/splash.html"}, function (err, output) {
			if (err) {
				throw err;
			}
			res.send(output);
		});
	};
	
	/**
	 * @description SECTION 4.1 Draft 11
	 * Call to this function has to be secured by signature etc.
	 * If the end-user grants the access request, the authorization server 
	 * issues an access token, an authorization code, or both, and delivers 
	 * them to the client by adding the following parameters to the 
	 * redirection URI (as described below)
	 * 
	 * @param code REQUIRED if the response type is code or code_and_token, 
	 * otherwise MUST NOT be included. The authorization code generated 
	 * by the authorization server. The authorization code SHOULD expire 
	 * shortly after it is issued to minimize the risk of leaks. The client 
	 * MUST NOT reuse the authorization code. If an authorization code is 
	 * used more than once, the authorization server MAY revoke all tokens 
	 * previously issued based on that authorization code. 
	 * The authorization code is bound to the client identifier 
	 * and redirection URI.
	 * 
	 * @param access_token REQUIRED if the response type is token or 
	 * code_and_token, otherwise MUST NOT be included. 
	 * The access token issued by the authorization server.
	 * 
	 * @param token_type REQUIRED if the response includes an access token. 
	 * The type of the token issued. The token type informs the client 
	 * how the access token is to be used when accessing a 
	 * protected resource as described in Section 6.1.
	 * 
	 * @param expires_in OPTIONAL. The duration in seconds of the 
	 * access token lifetime if an access token is included. 
	 * For example, the value 3600 denotes that the access token will 
	 * expire in one hour from the time the response was generated 
	 * by the authorization server.
	 * 
	 * @param scope OPTIONAL. The scope of the access token as a list of 
	 * space-delimited strings if an access token is included. The value 
	 * of the scope parameter is defined by the authorization server. 
	 * If the value contains multiple space-delimited strings, their order 
	 * does not matter, and each string adds an additional access range to 
	 * the requested scope. The authorization server SHOULD include the 
	 * parameter if the requested scope is different from the one 
	 * requested by the client.
	 * 
	 * @param state REQUIRED if the state parameter was present in the 
	 * client authorization request. Set to the exact value received 
	 * from the client.
	 * 
	 */
	that.finish_authorize = function (req, res, next) { 
		
		if (parseInt(req.body.authorized, 10) !== 1) {
	        res.send("user denied the authorizisation");
	    }
		
		if (req.oauth_params.response_type === "code") { 
			oauthmodel.create_auth_code(req.oauth_params.client_id, req.oauth_params.client.auth_redirect_uri, req.oauth_params.scope, req.user._id, function (err, auth_code) {
				if (err) {
					throw err;
				} 
				var params = {}; 
				params.code = auth_code.code;
				authorize_redirect(res, req.oauth_params.client.auth_redirect_uri, params);
			}); 
        }
		
		if (req.oauth_params.response_type === "token") {
			oauthmodel.create_access_token(req.oauth_params.client_id, req.oauth_params.scope, req.user._id, function (err, access_token) {
				if (err) {
					throw err;
				} 
				var params = {}; 
				params.access_token = access_token.access_token;
				params.expires_in = access_token.expires - (Math.round(new Date().getTime() / 1000));
				params.token_type = "access_token"; //not specified in SECTION 6.1 of draft 11 
				authorize_redirect(res, req.oauth_params.client.auth_redirect_uri, params);
            }); 
        }
		if (req.oauth_params.response_type === "code_and_token") {
			oauthmodel.create_auth_code(req.oauth_params.client_id, req.oauth_params.client.auth_redirect_uri, req.oauth_params.scope, req.user._id, function (err, auth_code) {
            	if (err) {
            		throw err;
            	}  
            	var params = {}; 
            	params.code = auth_code.code;
            	oauthmodel.create_access_token(req.oauth_params.client_id, req.oauth_params.scope, req.user._id, function (err, access_token) { 
            		if (err) {
            			throw err;
            		}  
            		params.access_token = access_token.access_token;
            		params.expires_in = access_token.expires - (Math.round(new Date().getTime() / 1000));
            		params.token_type = "access_token"; //not specified in SECTION 6.1 of draft 11
            		authorize_redirect(res, req.oauth_params.client.auth_redirect_uri, params);
            	}); 
            }); 
        } 
	};
	return that;
};

exports = module.exports = controller({});
