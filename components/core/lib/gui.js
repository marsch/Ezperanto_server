var dust = require('../../../deps/dust'),
	_ = require("../../../lib/underscore/underscore"),
	events = require('events');

dust.optimizers.format = function(ctx, node) { return node };

gui = function (spec) { 
	var that = 	_.clone(events.EventEmitter.prototype), 
		blocks = {};
	
	
	that.init = function (req, res) { 
		blocks = {};  
		that.emit("init", req, res);
	};
	
	//to add something like a menu item, just add another block to the position (ordering might be a problem)
	that.addBlock = function (viewname, options, callback) {
		callback = callback || function () {}; //no callback is show callback
		//if not an array
		if (!(typeof blocks[options.position] === 'object' && blocks[options.position].constructor === Array)) {
			blocks[options.position] = []; 
		}
		
		dust.render(viewname, options.locals, function (err, out) {
			if (err) {
				callback(err);
			}
			blocks[options.position].push(out);
			callback(false); 
		});
		//blocks[position].push(output);
	};
	
	that.addInlineBlock = function (position, input) {
		if (!(typeof blocks[position] === 'object' && blocks[position].constructor === Array)) {
			blocks[position] = []; 
		}
		if (!(typeof input === 'object' && input.constructor === Array)) {
			input = [input];
		}
		for (var i = 0; i < input.length; i = i + 1) {
			blocks[position].push(input[i]);
		} 
	};
	
	that.setBlocks = function (blocks) {
		blocks = blocks;
	};
	
	that.getBlocks = function () {
		return blocks;
	}; 
	
	that.render = function (layout, callback) {
		dust.render(layout, that.getBlocks(), callback); 
		blocks = {}; //delete silently on render block (flush)
	};
	
	that.addContent = function (viewname, options, callback) { 
		options.layout = options.layout || "layout/layout.html";
		options.position = options.position || "content";
		
		if (options.locals && options.locals.message) { 
			that.addInlineBlock("message", options.locals.message);
		}
		
		that.addBlock(viewname, options, function (err) {
			if (err) {
				throw err;
			}
			that.render(options.layout, callback); 
		});
	};
	
	return that;
};
exports = module.exports = gui({});