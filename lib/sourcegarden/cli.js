var fs = require('fs');
var sys = require('sys');

cli = function (specs) {
	var that = {}, usage, stdin;
	specs = specs || {};

	usage = '\x1b[1mUsage\x1b[0m: umcc [options] \n' + '\n' +
			'\x1b[1mOptions\x1b[0m:\n' +
			'  -p, --port         Define Http-Port to listen to. Default is ' +
			specs.port + '\n' +
			'  -w, --worker NUMBER  Add additional worker, Default is ' +
			specs.worker + '\n' +
			'  -v, --version          Output framework version\n' +
			'  -h, --help             Output help information\n';

	/**
	 * Exit with the given `str`.
	 * 
	 * @param {String}
	 *            str
	 */
	that.abort = function (str) {
		console.error(str);
		process.exit(1);
	};

	/**
	 * Check if the given directory `path` is empty.
	 * 
	 * @param {String}
	 *            path
	 * @param {Function}
	 *            fn
	 */
	that.emptyDirectory = function (path, fn) {
		fs.readdir(path, function (err, files) {
			if (err && err.errno !== process.ENOENT) {
				throw err;
			}
			fn(!files || !files.length);
		});
	};

	/**
	 * echo str > path.
	 * 
	 * @param {String}
	 *            path
	 * @param {String}
	 *            str  
	 */
	that.write = function (path, str) {
		fs.writeFile(path, str);
		console.log('   \x1b[33mcreate\x1b[0m : ' + path);
	};

	/**
	 * Prompt confirmation with the given `msg`.
	 * 
	 * @param {String}
	 *            msg
	 * @param {Function}
	 *            fn
	 */
	that.confirm = function (msg, fn) {
		prompt(msg, function (val) {
			fn(/^ *y(es)?/i.test(val));
		});
	};

	/**
	 * Prompt input with the given `msg` and callback `fn`.
	 * 
	 * @param {String}
	 *            msg
	 * @param {Function}
	 *            fn
	 */
	that.prompt = function (msg, fn) {
		stdin = stdin || process.openStdin();
		sys[msg[msg.length - 1] === ' ' ? 'print' : 'puts'](msg);
		stdin.setEncoding('ascii');
		stdin.addListener('data', function (data) {
			fn(data);
			stdin.removeListener('data', arguments.callee);
		});
	};

	/**
	 * Mkdir -p.
	 * 
	 * @param {String}
	 *            path
	 * @param {Function}
	 *            fn
	 */
	that.mkdir = function (path, fn) {
		exec('mkdir -p ' + path, function (err) {
			if (err) {
				throw err;
			}
			console.log('   \x1b[33mcreate\x1b[0m : ' + path);
			fn();
		});
	};

	that.proceed = function (cspecs) {
		var args = process.argv.slice(2), path = '.', arg;

		specs = cspecs || specs;

		while (args.length) {
			arg = args.shift();
			switch (arg) {
			case '-h':
			case '--help':
				abort(usage);
				break;
			case '-v':
			case '--version':
				abort(specs.version);
				break;
			default:
				path = arg;
			}
		}
		that.startServer();
	};

	that.log = function (str) {
		console.log(str);
	};

	return that;
};
exports = module.exports = cli();