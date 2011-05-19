var dust = require('dust'),
    webcontroller = require("../../core/controllers/webcontroller"), 
    _ = require("../../../lib/underscore/underscore"),
    model = require("../../../lib/sourcegarden/riakmodel"), 
    uuid = require("../../../lib/sourcegarden/uuid"),
    crypto = require("crypto"), 
    ldap = require('../../../lib/ext/node-ldapauth/ldapauth'),
    controller;

controller = function (spec) {
  var that = _.clone(webcontroller), authenticate,
      viewPath = __dirname.split("/").slice(0, -1).join("/") + "/views/";

  var md5 = function (str) {
    return crypto.createHash('md5').update(str).digest('hex');
  };

  var authenticate = function (name, pass, callback) {
    model.bucket('users').getItems({where: {name: name}}, model.getAlphaNumSort('name', 'asc'), 0, 1, function (err, users) {
        if (!users[0] || users.length === 0) {
        return callback(new Error('cannot find user'));
        }
        if (users[0].pass === md5(pass + users[0].salt)) {
        return callback(null, users[0]);
        }
        callback(new Error('invalid password'));
        });
  };

  //lookup ldap, checks if the user exits in the database,
  //if not, the user will created
  var authenticateLdap = function (name, pass, callback) { 
    var userdn = applications['server'].getConfig().ldapuidattr + "=" + name + "," + applications['server'].getConfig().ldapsuffix;

    ldap.authenticate(applications['server'].getConfig().ldaphost, applications['server'].getConfig().ldapport /*port*/, userdn, pass, function (err, result) {
        if (err) {
        callback(err);
        } 
        if (result === false) {
        callback(new Error('invalid username/password'));
        }

        if (result === true) {
        model.bucket('users').getItems({where: {name: name}}, model.getAlphaNumSort('name', 'asc'), 0, 1, function (err, users) {
          if (!users[0] || users.length === 0) {
          //return callback(new Error('cannot find user'));
          //create user
          var date = new Date(),
          myUser = {}, secretStr;

          myUser.name = name;

          myUser._id = uuid.uuid();

          secretStr = myUser.name + myUser._id + (date.getTime().toString(36)) + ((Math.round(46656 * 46656 * 46656 * 36 * Math.random())).toString(36));
          myUser.salt = crypto.createHash('md5').update(secretStr).digest('hex');
          myUser.pass = crypto.createHash('md5').update(pass + myUser.salt).digest('hex');
          myUser.ldap_pass = pass; //TODO: encrypt

          model.bucket('users').saveItem(myUser, function (err, result) {
            if (!err) { 
            callback(false, myUser);
            }
            else {
            callback("error on creating user");
            } 
            });
          } else if (users[0].pass !== md5(pass + users[0].salt)) {
            users[0].pass = md5(pass + users[0].salt);
            users[0].ldap_pass = pass; //TODO: encrypt
            model.bucket('users').saveItem(users[0], function (err, result) {
                if (!err) { 
                callback(false, users[0]);
                }
                else {
                callback("error on updating user");
                } 
                }); 
          } else {
            callback(false, users[0]);
          } 
        });
        } 
    });
  };



  that.bootstrap = function () { 
    applications['server'].getHttpApp().get("/login", that.common, that.showLogin);
    applications['server'].getHttpApp().get("/forgot", that.common, that.showForgot);
    applications['server'].getHttpApp().get("/logout", that.common, that.doLogout);
    applications['server'].getHttpApp().post("/login", that.common, that.doLogin);
    that.loadViews(viewPath, function (err, result) { 
        }); 
  };

  that.showLogin = function (req, res) { 
    that.gui.addContent("login/login.html", {locals: {message: that.message(req)}, layout: "layout/splash.html"}, function (err, output) {
        if (err) {
        throw err;
        }
        res.send(output);
        });
  };

  that.showForgot = function (req, res) {
    that.gui.addContent("forgot/forgot.html", {locals: {message: ""}, layout: "layout/splash.html"}, function (err, output) {
        if (err) {
        throw err;
        }
        res.send(output);
        });
  };

  that.doLogout = function (req, res) {
    // destroy the user's session to log them out
    // will be re-created next request
    req.session.destroy(function () {
        res.redirect('/');
        });
  };

  that.doLogin = function (req, res) {
    //check for superuser
    if (req.body.username == applications['server'].getConfig().superuser) {
      if (req.body.password == applications['server'].getConfig().superpass) {
        console.log("successful superuser login");
        //okay superuser is in place 
        var user = {};
        user.name = applications['server'].getConfig().superuser;
        user._id = "SUPERUSER";
        user.permissions = ["is_admin"];
        req.session.regenerate(function () {
            // Store the user's primary key 
            // in the session store to be retrieved,
            // or in this case the entire user object 

            req.user = user;
            req.session.user_id = user._id;   
            res.redirect('/');
            });
      } else {
        req.session.error = 'Authentication failed, please check your username and password.';
        res.redirect('back');
      }
    }


    switch(applications['server'].getConfig().authmodule) {
      case "ldap":
        authenticateLdap(req.body.username, req.body.password, function (err, user) {
            if (err) {
            req.session.error = 'Authentication failed, please check your username and password.';
            res.redirect('back');
            } else { 
            req.session.regenerate(function () {
              // Store the user's primary key 
              // in the session store to be retrieved,
              // or in this case the entire user object
              req.user = user;
              req.session.user_id = user._id; 
              //  res.send("SUPER");
              res.redirect('/');
              });
            }
            });
      break;
      case "database":
      default:
        authenticate(req.body.username, req.body.password, function (err, user) {
            if (user) { 
            req.session.regenerate(function () {
              // Store the user's primary key 
              // in the session store to be retrieved,
              // or in this case the entire user object
              req.user = user;
              req.session.user_id = user._id; 
              res.redirect('/');
              });
            } else {
            req.session.error = 'Authentication failed, please check your username and password.';
            res.redirect('/');
            }
            });
        break;
    }

  };  
  return that;
};

exports = module.exports = controller({});
