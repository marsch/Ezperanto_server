

oautherrors = function (spec) {
	var that = {};

	that.auth_errors = {
			invalid_request: {
				error: "invalid_request",
				error_description: "The request is missing a required parameter, includes an unsupported parameter or parameter value, or is otherwise malformed.",
				return_code: 400 //Bad Request
			},
			invalid_client: {
				error: 'invalid_client',
				error_description: "The client identifier provided is invalid.",
				return_code: 400 //Bad Request
			},
			unauthorized_client: {
				error: 'unauthorized_client',
				error_description: "The client is not authorized to use the requested response type.",
				return_code: 400 
			},
			redirect_uri_mismatch: {
				error: 'redirect_uri_mismatch',
				error_description: "The redirection URI provided does not match a pre-registered value.",
				return_code: 400
			},
			access_denied: {
				error: 'access_denied',
				error_description: "The end-user or authorization server denied the request.",
				return_code: 401 //Unauthorized
			},
			unsupported_response_type: {
				error: 'unsupported_response_type',
				error_description: "The requested response type is not supported by the authorization server.",
				return_code: 400
			},
			invalid_scope: {
				error: 'invalid_scope',
				error_description: "The requested scope is invalid, unknown, or malformed.",
				return_code: 400
			}
		};
	that.access_token_errors = {
		    invalid_request: {
		    	error: 'invalid_request',
				error_description: "The request is missing a required parameter, includes an unsupported parameter or parameter value, repeats a parameter, includes multiple credentials, utilizes more than one mechanism for authenticating the client, or is otherwise malformed. ",
				return_code: 400 //Bad Request
		    },
		    invalid_client: {
		    	error: 'invalid_client',
				error_description: "The client identifier provided is invalid, the client failed to authenticate, the client did not include its credentials, provided multiple client credentials, or used unsupported credentials type. ",
				return_code: 400 //Bad Request
		    },
		    unauthorized_client: {
		    	error: 'unauthorized_client',
				error_description: "The authenticated client is not authorized to use the access grant type provided. ",
				return_code: 400 //Bad Request
		    },
		    invalid_grant: {
		    	error: 'invalid_grant',
				error_description: "The provided access grant is invalid, expired, or revoked (e.g. invalid assertion, expired authorization token, bad end-user password credentials, or mismatching authorization code and redirection URI). ",
				return_code: 400 //Bad Request
		    },
		    unsupported_grant_type: {
		    	error: 'unsupported_grant_type',
				error_description: "The access grant included - its type or another attribute - is not supported by the authorization server. ",
				return_code: 400 //Bad Request
		    },
		    invalid_scope: {
		    	error: 'invalid_scope',
				error_description: "The requested scope is invalid, unknown, malformed, or exceeds the previously granted scope. ",
				return_code: 400 //Bad Request
		    } 
		};
	that.token_validation_errors = {
		    invalid_request: {
		        error: "invalid_request",
		        error_description: "The request is missing a required parameter, includes an unsupported parameter or parameter value, repeats the same parameter, uses more than one method for including an access token, or is otherwise malformed. The resource server SHOULD respond with the HTTP 400 (Bad Request) status code.",
		        return_code: 400 //Bad Request
		    },
		    invalid_token: {
		        error: "invalid_token",
		        error_description: "The access token provided is expired, revoked, malformed, or invalid for other reasons. The resource SHOULD respond with the HTTP 401 (Unauthorized) status code. The client MAY request a new access token and retry the protected resource request.",
		        return_code: 401 //Unauthorized
		    },
		    insufficient_scope: {
		        error: "insufficient_scope",
		        error_description: "The request requires higher privileges than provided by the access token. The resource server SHOULD respond with the HTTP 403 (Forbidden) status code and MAY include the scope attribute with the scope necessary to access the protected resource",
		        return_code: 403 //Forbidden
		    }
		};
	return that;
};
exports = module.exports = oautherrors({});