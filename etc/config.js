var app_config = {
  vhost: "server.umccdev.local",
  session_secret: "B42356AE-3FE2-46C5-A858-B5DF8409275E",
  application_secret: "B42356AE-3FE2-46C5-A858-B5DF8409275E", //should be diff from session secret
  template: "default",
  authmodule: "database",
  ldaphost: "192.168.0.12",
  ldapport: 389,
  ldapsuffix: "ou=people,dc=sourcegarden,dc=local",
  ldapuidattr: "uid",
  
  superuser: "admin",
  superpass: "s789azt",  
  lockFile: "/tmp/umcc_daemon.pid",
  exclude_components: [] 
};
exports.config = module.exports = app_config;
