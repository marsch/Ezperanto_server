var fugue = require('../deps/fugue');
var cli = require('../lib/sourcegarden/cli');

umc_cli = function (specs) {
	var that = cli, usage, stdin;
	specs = specs || {};

	usage = '\x1b[1mUsage\x1b[0m: umcc [start|stop] [options] \n' + '\n' +
			'\x1b[1mOptions\x1b[0m:\n' +
			'  -p, --port         Define Http-Port to listen to. Default is ' +
			specs.port + '\n' +
			'  -w, --worker NUMBER  Add additional worker, Default is ' +
			specs.worker + '\n' +
			'  -v, --version          Output framework version\n' +
			'  -h, --help             Output help information\n';

	that.proceed = function (cspecs) {
		var args = process.argv.slice(2), path = '.', 
			arg,
			start = false; 
		specs = cspecs || specs; 
		

		
		
		while (args.length) {
			arg = args.shift();
			switch (arg) {
			case '-h':
			case '--help':
				that.abort(usage);
				break;
			case '-v':
			case '--version':
				that.abort(specs.version);
				break;
			case '-p':
			case '--port':
				args.length ? (specs.port = args.shift()) : that.abort('--port requires an argument');
				break;
			case '-w':
			case '--worker':
				args.length ? (specs.worker = args.shift()) : that.abort('--worker requires an argument');
				break;
			default:
				path = arg;
			}
		}
		
		var options = {};
		options.verbose = false;
		options.log_file = specs.log_file;
		options.master_log_file = specs.master_log_file;
		options.working_path = __dirname;
		options.master_pid_path = "/tmp/umcc.pid";
		options.worker_kill_timeout = 1;
		
		
		if (process.argv.slice(2)[0] !== "start" && process.argv.slice(2)[0] !== "stop") {
			that.abort(usage);
		} else if (process.argv.slice(2)[0] === "stop") { 
			return; 
		}
		
		console.log("Server starting... on " + specs.host + ":" + specs.port + " with " + specs.worker + " worker(s).");
		console.log("Logfile:" + options.log_file);
		console.log("Master Logfile:" + options.master_log_file);
		console.log("Working Path:" + options.working_path);
		console.log("Master PID Path:" + options.master_pid_path);

		fugue.start(specs.server, specs.port, specs.host, specs.worker, options);
	};
	return that;
};

exports = module.exports = umc_cli({
	port : 3080,
	host : "127.0.0.1",
	worker : 1,
	master_log_file : "/var/log/umcc_log"
});
