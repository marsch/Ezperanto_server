var base64 = require('base64');
var crypto = require('crypto');

var signedRequest = function () {
	var that = {},
	specs = {}, cipher, base64_url_decode, base64_url_encode;

	//private
	cipher = function (content, secret) {
		return crypto.createHash('sha256', secret).update(content).digest('hex');
	};

	base64_url_decode = function (input) {
		return base64.decode(input.replace(/-/g, '+').replace(/_/g, '/'));
	};

	base64_url_encode = function (input) {
		return base64.encode(input).replace(/\+/g, '-').replace(/\//g, '_');
	};

	//public
	that.encode = function (jsonObj, secret) {
		var payload64, sig;
		jsonObj.algorithm = "HMAC-SHA256";
		payload64 = base64_url_encode(JSON.stringify(jsonObj));
		sig = base64_url_encode(cipher(payload64, secret));
		return sig + "." + payload64;
	};

	that.decode = function (signedRequest, secret, doValidate) {
		doValidate = (typeof doValidate === "undefined")? true: doValidate;
		var payload, encoded_sig, sig, data, expected_sig;
		encoded_sig = signedRequest.split(".")[0];
		payload = signedRequest.split(".")[1]; 
		sig = base64_url_decode(encoded_sig); 
		data = JSON.parse(base64_url_decode(payload));

		//only this one matches
		if (data.algorithm !== "HMAC-SHA256" && doValidate) {
			console.log(data);
			throw 'Unknown algorithm. Expected HMAC-SHA256';
		}

		//check signature
		expected_sig = (cipher(payload, secret)); 
		if (expected_sig !== sig && doValidate) {
			throw 'Bad Signed JSON signature!';
		} 
		return data;
	}; 
	return that;
};

exports.signedrequest = module.exports = signedRequest();
