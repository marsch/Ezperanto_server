global.applications = []
applications['server'] = require('./includes/application');
applications['server'].bootstrap(function () {
	applications['server'].getHttpApp().listen(80);
});