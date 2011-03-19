require.paths.push('./deps/');
require.paths.push('./deps/connect/support');
require.paths.push('./deps/connect/middleware');
global.applications = []
applications['server'] = require('./includes/application');
applications['server'].bootstrap(function () {
	applications['server'].getHttpApp().listen(80);
});
