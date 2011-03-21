var model = require("../../../lib/sourcegarden/riakmodel"), 
	uuid = require("../../../lib/sourcegarden/uuid");

oauthmodel = function (spec) {
	var that = {};
	
	that.get_available_scopes = function (callback) {
		var available_scopes = {
			    'general': {
			        name: 'general',
			        title: 'Access general Information',
			        description: 'Access the general informations about you.',
			        icon: 'default'
			    },
			    'ox_user_contacts': {
			    	name: 'ox_user_contacts',
			    	title: 'Access Open-xchange Contacts',
			    	description: 'noop',
			    	icon: 'default'
			    },
			    'ox_user_calendar': {
					name: 'ox_user_calendar',
					title: 'Access Open-xchange Calendar',
					description: "noop2",
					icon: 'default'
			    }
			};
		callback(false, available_scopes);
	};
	
	that.create_auth_code = function (client_id, redirect_uri, scope, user_id, callback) {
		var auth_code;
		user_id = user_id || null;
		callback = callback || function () {};
		
		auth_code = {
	        _id : uuid.uuid(),
	        code : uuid.uuid(32),
	        client_id : client_id,
	        redirect_uri : redirect_uri,
	        expires: (Math.round((new Date().getTime() / 1000) + spec.auth_code_lifetime)),
	        scope: scope,
	        user_id: user_id
		}; 
		model.bucket('authCodes').saveItem(auth_code, function (err) {
			if (err) {
				callback(err, null);
			} else {  
				callback(null, auth_code);
			} 
		}); 
	};
	
	that.create_access_token = function (client_id, scope, user_id, callback) {
		var token;
		user_id = user_id || null;
		callback = callback || function () {};
		console.log("CREATE WITH SCOPE:::");
		console.log(scope);
		console.log("---------------------");
		token = { 
		        _id : uuid.uuid(),
		        client_id: client_id,
		        access_token: uuid.uuid(32),
		        expires:  (Math.round((new Date().getTime() / 1000) + spec.access_token_lifetime)),
		        scope: scope,
		        user_id: user_id
		    };
		model.bucket('accessTokens').saveItem(token, function (err) {
			if (err) {
				callback(err, null);
			} else {
				callback(null, token);
			} 
		});
	};
	
	that.get_client = function (client_id, callback) { 
		model.bucket('apps').getItem(client_id, function (err, data) { 
			if (err) {
				throw err;
			}
			callback(null, data);
		});
	};
	
	that.get_auth_code = function (code, callback) {
		model.bucket("authCodes").getItems({where: {code: code}}, model.getAlphaNumSort('expires', 'desc'), 0, 10, function (err, authcodes) {
			if (err) {
				throw err;
			}
			if (authcodes && authcodes.length > 0) {
				callback(false, authcodes[0]);
			} else {
				callback(false, false);
			}
		});
	};
	that.get_access_token = function (token, callback) {
		model.bucket("accessTokens").getItems({where: {access_token: token}}, model.getAlphaNumSort('expires', 'desc'), 0, 10, function (err, authcodes) {
			if (err) {
				throw err;
			}
			if (authcodes && authcodes.length > 0) {
				callback(false, authcodes[0]);
			} else {
				callback(false, false);
			}
		});
	};
	that.delete_auth_code = function (code_id, callback) {
		model.bucket("authCodes").deleteItem(code_id, callback);
	};
	that.get_user = function (user_id, callback) {
		model.bucket('users').getItem(user_id, callback);
	};
	that.save_user = function (user, callback) {
		model.bucket('users').saveItem(user, callback);
	};
		
	return that;
};
exports = module.exports = oauthmodel({
	auth_code_lifetime: 3600, //one hour
	access_token_lifetime: 84600 //24h
});