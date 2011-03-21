require.paths.push('./deps/');
require.paths.push('./deps/connect/support');
require.paths.push('./deps/connect/middleware');


var vows = require('vows'),
	assert = require('assert'),
	sinon = require('sinon'),
	events = require('events');
	sigReq = require("../lib/sourcegarden/signedrequest.js");
	
var suite1 = vows.describe("autocontroller");
suite1.addBatch({
	"when called send a signed request": {
		topic: function () {
			var me = this;
			this.MOCK_REQUEST = Object.create(events.EventEmitter.prototype, { constructor: { value: {}, enumerable: false }});
			this.MOCK_RESPONSE = Object.create(events.EventEmitter.prototype, { constructor: { value: {}, enumerable: false }});
			this.MOCK_RESPONSE.send = function () {me.callback();};
			this.STUB_RESPONSE_SEND = sinon.spy(this.MOCK_RESPONSE, "send");

			
			applications = {'server': { getConfig: function (){ return { application_secret: "mickeymouse"}}}};
			
			this.autocontroller = require("../components/admin/controllers/web.auto.js");
			this.autocontroller.doAutoProvision(this.MOCK_REQUEST, this.MOCK_RESPONSE);
			
			this.MOCK_REQUEST.emit("data", "OWMzNjc3NzhlMDQ2NWY5NGFkNTMzMWQ1NjNmNjNkMTI2OTNkMzJmMTRmMTNhMThjOTVhYmVlOTYxNzgyYTNkMg==.eyJ1c2VybmFtZSI6InNjaGVsaWdhIiwiY29udGV4dCI6IjEiLCJwYXNzd29yZCI6Iml0c2NoMnNhbiJ9");
			this.MOCK_REQUEST.emit("end" );
			
			
		}, 
		'send response': function(topic) { 
			assert.isTrue(this.STUB_RESPONSE_SEND.called, "res.send is called");
			assert.isTrue(this.STUB_RESPONSE_SEND.calledWith({success: true}), "res.send is called with success:true");
		}
	}
});

exports.suite1 = suite1;