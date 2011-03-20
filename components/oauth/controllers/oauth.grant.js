var dust = require('dust'),
	_ = require("../../../lib/underscore/underscore"),
	webcontroller = require("../../core/controllers/webcontroller"), 
	oauthmodel = require("../lib/oauth.model"),  
	oautherrors = require("../lib/oauth.errors"),
	 
	controller; 

controller = function (spec) {
	var that = _.clone(webcontroller),   
		viewPath = __dirname.split("/").slice(0, -1).join("/") + "/views/"; 
 
	that.bootstrap = function () {  
		webcontroller.bootstrap(); //call parent  
		applications['server'].getHttpApp().post("/access_token", that.common, that.grant_access_token); 
		that.loadViews(viewPath);
	}; 
	
	
	/**
	 * @description SECTION 5 Obtaining an Access Token
	 * 
	 * The client obtains an access token by authenticating with the authorization 
	 * server and presenting its access grant (in the form of an authorization  
	 * code, resource owner credentials, an assertion, or a refresh token).
	 * 
	 * Since requests to the token endpoint result in the transmission of 
	 * clear-text credentials in the HTTP request and response, the authorization 
	 * server MUST require the use of a transport-layer security mechanism when 
	 * sending requests to the token endpoints. Servers MUST support TLS 1.2 as 
	 * defined in [RFC5246] (Dierks, T. and E. Rescorla, “The Transport Layer 
	 * Security (TLS) Protocol Version 1.2,” August 2008.), and MAY 
	 * support additional transport-layer security mechanisms.
	 * 
	 * The client requests an access token by making an HTTP POST request to 
	 * the token endpoint. The location of the token endpoint can be found in 
	 * the service documentation. The token endpoint URI MAY include a query 
	 * component.
	 * 
	 * The client authenticates with the authorization server by adding its 
	 * client credentials to the request as described in Section 3 
	 * (Client Credentials). The authorization server MAY allow unauthenticated 
	 * access token requests when the client identity does not matter 
	 * (e.g. anonymous client) or when the client identity is established 
	 * via other means (e.g. using an assertion access grant).
	 * 
	 * The client constructs the request by including the following parameters 
	 * using the application/x-www-form-urlencoded format in the HTTP  
	 * request entity-body:
	 * 
	 * @param grant_type REQUIRED. The access grant type included in the request. 
	 * Value MUST be one of authorization_code, password, refresh_token, 
	 * client_credentials, or an absolute URI identifying an assertion 
	 * format supported by the authorization server.
	 * 
	 * @param scope OPTIONAL. The scope of the access request expressed as a 
	 * list of space-delimited strings. The value of the scope parameter is 
	 * defined by the authorization server. If the value contains multiple 
	 * space-delimited strings, their order does not matter, and each 
	 * string adds an additional access range to the requested scope. 
	 * If the access grant being used already represents an approved scope 
	 * (e.g. authorization code, assertion), the requested scope MUST be 
	 * equal or lesser than the scope previously granted, and if omitted 
	 * is treated as equal to the previously approved scope.
	 * 
	 * In addition, the client MUST include the appropriate parameters 
	 * listed for the selected access grant type as described in 
	 * Section 5.1 (Access Grant Types). 
	 * 
	 */
	that.grant_access_token = function (req, res, next) { 
		
		var grant_type = req.body.grant_type || false,
		scope = req.body.scope || "";

		if (req.query.assertion && !grant_type) {
			grant_type = "assertion"; //because identified by the assertion uri, see spec
		} 

		if (!grant_type) {
			res.send(oautherrors.access_token_errors.invalid_request); 
		}
		if (grant_type !== "authorization_code" && grant_type !== "password" && grant_type !== "refresh_token" && grant_type !== "client_credentials" && grant_type !== "assertion") {
			res.send(oautherrors.access_token_errors.unsupported_grant_type); 
		} 
		switch (grant_type) {
		case 'authorization_code':
			that.grant_authorization_code(req, res);
			break;
		case 'password':
			that.grant_password(req, res);
			break;
		case 'refresh_token':
			that.grant_refresh_token(req, res);
			break;
		case 'client_credentials':
			that.grant_client_credentials(req, res);
			break;
		case 'assertion':
			that.grant_assertion(req, res);
			break;
	    }
	};
	
	/**
	 * @description is called by grant_access_token-Method to fulfill the
	 * Authorization Code - grant_type
	 * 
	 * 5.1.1 Authorization Code
	 * ========================
	 * The client includes the authorization code using the authorization_code 
	 * access grant type and the following parameters: 
	 * 
	 * @param code REQUIRED. The authorization code received from 
	 * the authorization server.
	 * 
	 * @param redirect_uri REQUIRED. The redirection URI used in the  
	 * initial request. 
	 */ 
	that.grant_authorization_code = function (req, res) {
		var code = req.body.code || false,
			redirect_uri = req.body.redirect_uri || false, 
			client_id = req.body.client_id || false,
			client_secret = req.body.client_secret || false,
			scope = (req.body.scope)?(req.body.scope.split(",")):([]); //is optional
			
	    if (!(("|" + scope.join("|") + "|").indexOf('|general|') >= 0)) {
	    	scope.push('general'); //default
	    }
	    	    
	    if (code === false || !redirect_uri || !client_id || !client_secret) {
	        res.send(oautherrors.access_token_errors.invalid_request); 
	    }
	    
	    
	    oauthmodel.get_auth_code(code, function (err, auth_code) {
	    	if (err || !auth_code) {
	            //whopa whats wrong with you  
	            res.send(oautherrors.access_token_errors.invalid_request);
	    	} else {
	    		if ((Math.round(new Date().getTime()) - auth_code.expires) < 0 || auth_code.redirect_uri !== redirect_uri) {
	                //so auth_code is expired
	                res.send(oautherrors.access_token_errors.invalid_grant); 
	            } else if (auth_code.client_id !== client_id) { 
	                res.send(oautherrors.access_token_errors.invalid_client); 
	            } else { 
	            	oauthmodel.get_client(client_id, function (err, app) {
	            		if (err) {
	            			throw err;
	            		}
	            		if (app.application_secret !== client_secret) { 
	            			res.send(oautherrors.access_token_errors.invalid_client); 
	            		} else if (app.auth_redirect_uri !== redirect_uri) { 
	            			res.send(oautherrors.access_token_errors.invalid_grant); 
	            		} else { 
	            			for (var i in scope) {
                                if (!scope[i] in auth_code.scope) { 
                                    res.send(oautherrors.access_token_errors.invalid_scope); 
                                } 
                            }
	            			oauthmodel.create_access_token(auth_code.client_id, auth_code.scope, auth_code.user_id, function (err, access_token) {
	            				if (err) {
	            					throw err;
	            				}
	            				oauthmodel.delete_auth_code(auth_code._id, function (err, delresponse) {
	            					if (err) {
	            						throw err;
	            					}
	            					var token = {
                                            access_token: access_token.access_token,
                                            token_type: "access_token", //not specified in SECTION 6.1 of draft 11
                                            expires: access_token.expires,
                                            expires_in: access_token.expires - (Math.round(new Date().getTime() / 1000)),
                                            refresh_token: 'unimplemented', //unimplemented
                                            scope: access_token.scope.join(','),
                                            user_id: access_token.user_id 
                                        };
	            					oauthmodel.get_user(access_token.user_id, function (err, user) {
	            						if (err) {
	            							throw err;
	            						}
	            						if (!user.apps) {
	            							user.apps = [];
	            						}
	            						if (user.apps.join().indexOf(app._id) === -1) {
	            							user.apps.push(app._id);
	            							oauthmodel.save_user(user, function (err, usaved) {
	            								if (err) {
	            									throw err;
	            								} 
	            								res.send(token);
	            							});
	            						} else { 
	            							res.send(token);
	            						} 
	            					});
	            				});
	            			});
	            		}
	            	});
	            }
	    	}
	    });
	};
	/**
	 * @description
	 * 5.1.2 Resource Owner Password Credentials
	 * =========================================
	 * The client includes the resource owner credentials using the password 
	 * access grant type and the following parameters: [[ add internationalization 
	 * consideration for username and password ]] 
	 * 
	 * @param username REQUIRED. The resource owner's username. 
	 * @param password REQUIRED. The resource owner's password. 
	 */
	that.grant_password = function (req, res) {
		throw "grant_password unimplemented";
	};
	
	/**
	 * @description
	 * 5.1.3 Client Credentials
	 * ========================
	 * The client can request an access token using only its client credentials 
	 * using the client_credentials access grant type. When omitting an explicit 
	 * access grant, the client is requesting access to the protected resources 
	 * under its control, or those of another resource owner which has been 
	 * previously arranged with the authorization server 
	 * (the method of which is beyond the scope of this specification).
	 */
	that.grant_client_credentials = function (req, res) {
	    throw "grant_client_credentials unimplemented";
	};	
	
	/**
	 * @description
	 * 5.1.4 Refresh Token
	 * ===================
	 * The client includes the refresh token using the refresh_token 
	 * access grant type and the following parameter:
	 * 
	 * @param refresh_token REQUIRED. The refresh token associated with the 
	 * access token to be refreshed.
	 */
	that.grant_refresh_token = function (req, res) {
	    throw "grant_refresh_token unimplemented";
	};
	
	/**
	 * @description
	 * 5.1.5 Assertion
	 * ===============
	 * The client includes an assertion by specifying the assertion format 
	 * using an absolute URI (as defined by the authorization server) as the 
	 * value of the grant_type parameter and by adding the following parameter: 
	 *  
	 * @param assertion REQUIRED. The assertion. 
	 */
	that.grant_assertion = function (req, res) {
	    throw "grant_assertion unimplemented";
	};

 
	return that;
};

exports = module.exports = controller({});
