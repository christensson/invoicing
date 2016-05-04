'use strict';
//Frameworks
var args = require('commander');
var express = require("express");
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var methodOverride = require('method-override');
var flash = require('connect-flash');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var path = require('path');
var marko = require('marko');
var multer = require('multer');
var i18n = require('i18next');
var i18nFsBackend = require('i18next-node-fs-backend');
var i18nMiddleware = require('i18next-express-middleware');
var simLatency = require('express-simulate-latency');
var helmet = require('helmet');
var expressEnforcesSsl = require('express-enforces-ssl');
var Q = require('q');
var defaults = require('./public/default.js').get();
var log = require('./log');

function increaseVerbosity(v, total) {
  return total + 1;
}

args.version('0.0.1')
  .option('--sim_latency', 'Simulate network latency')
  .option('--ssl', 'Start server on https')
  .option('--monitor', 'Monitor used resources')
  .option('--local', 'Run on localhost')
  .option('-v, --verbose', 'Be more verbose', increaseVerbosity, 0)
  .parse(process.argv);

switch(args.verbose) {
  case undefined:
  case 0:
    break;
  case 1:
    log.transports.console.level = 'verbose';
    log.transports.file.level = 'verbose';
    break;
  case 2:
    log.transports.console.level = 'debug';
    log.transports.file.level = 'debug';
    break;
  default:
  case 3:
    log.transports.console.level = 'silly';
    log.transports.file.level = 'silly';
    break;
}
log.info("Log level: {console: " + log.transports.console.level + ", file: " + log.transports.file.level + "}");

var smallLag = undefined;
if (args.sim_latency) {
  log.info("Server started in NW latency simulation mode.");
  smallLag = simLatency({ min: 500, max: 1000 });
}

var tmpDir = __dirname + "/tmp";

var app = express();

app.use(helmet.hidePoweredBy());
app.use(helmet.frameguard());
app.use(helmet.ieNoOpen());
app.use(helmet.xssFilter());
// Not working on chrome
//app.use(helmet.noSniff());
var ninetyDaysInMilliseconds = 7776000000;
app.use(helmet.hsts({ maxAge: ninetyDaysInMilliseconds }));

app.use(logger(args.local===true?'dev':'short', {stream: log.stream}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended : true
}));
app.use(cookieParser());
app.use(methodOverride('X-HTTP-Method-Override'));

app.set('trust proxy', 1) // trust first proxy
var enforceSsl = args.ssl === true || args.local !== true;
log.info("enforceSsl=" + enforceSsl);
app.use(session({
  secret : require('./deployment.json').session.secret,
  name : 'sessionId',
  resave : false,
  saveUninitialized : false,
  cookie: {
    secure: enforceSsl,
    httpOnly: true,
    maxAge: 4 * 60 * 60 * 1000 // 4 hours
  }
}));
if (enforceSsl) {
  log.info("use: expressEnforcesSsl");
  app.use(expressEnforcesSsl());
}
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));
app.use(express.static('node_modules/knockout/build/output'));
app.use(express.static('node_modules/bootstrap/js'));
app.use(express.static('node_modules/bootstrap/dist/js'));
app.use(express.static('node_modules/bootstrap/dist/css'));
app.use(express.static('node_modules/bootstrap'));
app.use(express.static('node_modules/director/build'));
app.use(express.static('node_modules/jquery/dist'));
app.use(express.static('node_modules/js-cache/bundle'));
app.use(express.static('node_modules/i18next'));
app.use(express.static('node_modules/i18next-xhr-backend/'));
app.use(express.static('node_modules/jqueryui/', {index: false}));
app.use(express.static('node_modules/knockout-jqautocomplete/build/'));

if (smallLag != undefined) {
  app.use(smallLag);
}

var upload = multer({
  dest: './uploads/',
  limits: {fileSize: 256*1024} // Max 256 Kbyte
});

// i18n
i18n
  .use(i18nFsBackend)
  .init({
    lng: defaults.defaultLng,
    preload: defaults.enabledLngList.slice(0),
    whitelist: defaults.enabledLngList.slice(0),
    fallbackLng: defaults.defaultLng,
    saveMissing: args.local === true,
    debug: args.verbose > 1,
    joinArrays: ' ',
    backend: {
      // path where resources get loaded from
      loadPath: 'locales/{{lng}}/{{ns}}.json',

      // path to post missing resources
      addPath: 'locales/{{lng}}/{{ns}}.missing.json',

      // jsonIndent to use when storing json files
      jsonIndent: 2
    }
  }, function(err, t) {
  });

app.use(i18nMiddleware.handle(i18n, {
    ignoreRoutes: ['uploads/', 'public/img/', 'public/', 'views/']
  }));

app.get('/locales/resources.json', i18nMiddleware.getResourcesHandler(i18n)); // serves resources for consumers (browser)

// App modules
var hostname = "";
var mydb = require('./mydb.js');
if (args.local) {
  mydb.setLocalDb();
} else {
  hostname = require('./deployment.json').host;
}

var reporter = require('./reporter.js');
var funct = require('./functions.js');
var googleAuth = require('./google_auth.json');

// Passport session setup.
passport.serializeUser(function(user, done) {
  log.debug("serializing " + user.info.name);
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  log.debug("deserializing " + JSON.stringify(obj));
  done(null, obj);
});

passport.use(
    'local-signin',
    new LocalStrategy(
        {
          passReqToCallback : true
        }, // allows us to pass back the request to the callback
        function(req, username, password, done) {
          log.info("signin: user=" + username);
          funct.localAuth(username, password, true).then(
              function(user) {
                if (user) {
                  log.debug("signin success: user=" + username + ", name=" + user.info.name);
                  req.flash('success', req.t("signin.loginOkMsg", {name: user.info.name}));
                  done(null, user);
                }
                if (!user) {
                  log.debug("signin failed: user=" + username);
                  req.flash('error', req.t("signin.loginNokMsg", {context: "local"}));
                  done(null, user);
                }
              }).fail(function(err) {
                log.error("signin: body=" + err.body);
              });
        }));

// Use the LocalStrategy within Passport to register/"signup" users.
passport.use(
    'local-signup',
    new LocalStrategy(
        {
          passReqToCallback : true
        }, // allows us to pass back the request to the callback
        function(req, username, password, done) {
          log.info("signup: user=" + username);
          var hash = funct.encryptPassword(password);
          var userData = {
            "username-local": username, // username is e-mail for local users!
            "password": hash,
            "info" : funct.createUserInfo(req.body.fullName, username)
          };
          var errorMessage = undefined;
          if (password.length < defaults.minPwdLen) {
            errorMessage = req.t("signin.registerNokMsg", {context: "pwdTooShort", len: defaults.minPwdLen});
            done(null, false, {message: errorMessage});
          } else {
            errorMessage = req.t("signin.registerNokMsg", {email: userData.info.email, context: "notInvited"});
            mydb.isEmailInvited(userData.info.email).then(function(inviteInfo) {
              errorMessage = req.t("signin.registerNokMsg");
              return funct.findOrCreate("username-local", userData, inviteInfo);
            }).then(function(result) {
              if (result.user) {
                if (result.isNew) {
                  req.flash('success', req.t("signin.registerOkMsg", {name: result.user.info.name}));
                  done(null, result.user);
                } else {
                  // Failure, registration doesn't expect user to exist.
                  done(null, false, {message: req.t("signin.registerNokMsg", {name: username, context: "userExists"})});
                }
                return done(null, result.user);
              } else {
                log.debug("signup: failed user=" + username);
                done(null, false, {message: errorMessage});
              }
            }).fail(function(error) {
              log.error("signup: msg=" + error.message);
              done(null, false, {message: errorMessage});
            });
          }
        }));

passport.use(new GoogleStrategy(
    {
      /* Three things below must be configured at https://console.developers.google.com/
       * Also the "Google+ API" needs to be enabled.
       */
      clientID: googleAuth.web.client_id,
      clientSecret: googleAuth.web.client_secret,
      callbackURL: hostname + "/auth/google/callback"
    },
    function(accessToken, refreshToken, profile, done) {
      process.nextTick(function () {
        log.info("Google-auth: displayName=" + profile.displayName +
          ", emails[0]=" + profile.emails[0].value);
        log.verbose("Google-auth: fullProfile=" + JSON.stringify(profile, null, 2));
        var userData = {
            "googleId" : profile.id,
            "info" : funct.createUserInfo(profile.displayName, profile.emails[0].value)
        };
        mydb.isEmailInvited(userData.info.email).fail(function(error) {
          log.info("Google-auth: isEmailInvited failed. msg=" + error.message);
          done(null, false, {
            message: i18n.t("signin.registerNokMsg", {email: userData.info.email, context: "notInvited"})});
        }).then(function(inviteInfo) {
          return funct.findOrCreate("googleId", userData, inviteInfo);
        }).then(function(result) {
          log.debug("Google authentication result=" + JSON.stringify(result));
          if (result.user) {
            result.user.isNew = result.isNew;
            log.info("Google-auth: Success! name=" + result.user.info.name + ", email=" + result.user.info.email);
            return done(null, result.user);
          } else {
            log.info("Google-auth: Failed!");
            done(null, false);
          }
        }).fail(function(error) {
          log.error("Google-auth: msg=" + error.message);
          done(null, false, {message: error.message});
        });
      });
    }
));

// Simple route middleware to ensure user is authenticated.
// Use this route middleware on any resource that needs to be protected. If
// the request is authenticated (typically via a persistent login session),
// the request will proceed. Otherwise, the user will be redirected to the
// login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    log.debug("ensureAuthenticated: Authenticated!");
    return next();
  }
  log.warn("ensureAuthenticated: Not authenticated!");
  req.flash('notice', req.t("signin.authNokMsg"));
  res.redirect('/signin');
}

function myFailureHandler(res, err) {
  var errorJson = {
    'name' : err.name,
    'constructor' : err.constructor,
    'message' : err.message
  };
  log.error('ERROR: ' + JSON.stringify(errorJson));
  res.sendStatus(500);
  res.end();
}

/**
 * Responds with:
 * - settings
 * - companies
 */
app.get("/api/initial", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  log.info("Get initial data: user=" + req.user.info.name + ", uid=" + uid);
  var settingsJob = mydb.getSettings(uid);
  var companiesJob = mydb.getCompanies(uid);

  var resJson = {};

  Q.all([settingsJob, companiesJob])
  .then(function(docs) {
    resJson.settings = docs[0];
    resJson.companies = docs[1];
    return Q();
  }, myFailureHandler.bind(null, res))
  .done(function() {
    res.status(200).json(resJson).end();
  });
});

app.get("/api/settings", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  log.info("Get settings: user=" + req.user.info.name + ", uid=" + uid);
  mydb.getSettings(uid).then(function(doc) {
    res.status(200).json(doc);
    res.end();
  }).fail(myFailureHandler.bind(null, res));
});

app.put("/api/settings", ensureAuthenticated, function(req, res) {
  var okHandler = function(logText, res, settings) {
    log.verbose(logText + ": OK, obj=" + JSON.stringify(settings));
    var resData = {
      'settings' : settings
    };
    res.status(200).json(resData);
    res.end();
  };
  var uid = req.user._id;
  var isAdmin = req.user.info.isAdmin;

  // Only admin is allowed to update license
  if (!isAdmin) {
    delete req.body.license;
  }

  log.info("Update settings: user=" + req.user.info.name + ", uid=" + uid
      + ", isAdmin=" + isAdmin + ", settings=" + JSON.stringify(req.body));
  mydb.updateSettings(uid, req.body).then(
    okHandler.bind(null, 'updateSettings', res)
  ).fail(
    myFailureHandler.bind(null, res)
  );
});

app.put("/api/user", ensureAuthenticated, function(req, res) {
  var okHandler = function(logText, res, user) {
    user = typeof user !== 'undefined' ? user : false;
    if (user) {
      log.verbose(logText + ": OK, obj=" + JSON.stringify(user));
      var resData = {
        'user' : user
      };
      res.status(200).json(resData);
    } else {
      log.verbose(logText + ": OK");
      res.status(204);
    }
    res.end();
  };
  var uid = req.user._id;
  var isLocalUser = req.user.hasOwnProperty("username-local");

  log.info("Update user: user=" + req.user.info.name + ", uid=" + uid
      + ", isLocalUser=" + isLocalUser + ", user=" + JSON.stringify(req.body));

  /* Only some fields are allowed to be updated for the user. Copy them...
   * Note that dot-notation is used for fields in sub-structures 
   * since user document is updated using the $set modifier */
  var user = {};
  if (req.body.name) {
    user['info.name'] = req.body.name;
  }
  /* Do not allow email/login updates yet... Need to make sure that new email is unique.
  if (req.body.email) {
    user['info.email'] = req.body.email;
    if (isLocalUser) {
      user["username-local"] = req.body.email;
    }
  }
  */

  if (JSON.stringify(user) !== "{}") {
    log.info("Update user: user=" + req.user.info.name + ", uid=" + uid
        + ": Will update using user=" + JSON.stringify(user));
    mydb.updateUser(uid, user).then(
      okHandler.bind(null, 'updateUser', res)
    ).fail(
      myFailureHandler.bind(null, res)
    );
  } else {
    log.info("Update user: user=" + req.user.info.name + ", uid=" + uid
        + ": Nothing to do... user=" + JSON.stringify(user));
    okHandler('updateUser', res);
  }
});

app.post("/api/user-local-pwd-update", ensureAuthenticated, function(req, res) {
  var okHandler = function(logText, res, data) {
    log.verbose(logText + ": OK, data=" + JSON.stringify(data));
    res.status(200).json(data);
    res.end();
  };
  var uid = req.user._id;
  var isLocalUser = req.user.hasOwnProperty("username-local");

  log.info("Update local user password: user=" + req.user.info.name + ", uid=" + uid
      + ", isLocalUser=" + isLocalUser);

  if (isLocalUser) {
    // Verify old password
    funct.localAuth(req.user["username-local"], req.body.oldPwd, false).then(function(user) {
      if (user) {
        // Old password OK, update to new
        var hash = funct.encryptPassword(req.body.newPwd);
        var user = {password: hash};
        mydb.updateUser(uid, user).then(
          okHandler.bind(null, 'updateLocalUserPassword', res, {'success': true})
        ).fail(
          myFailureHandler.bind(null, res)
        );
      } else {
        log.warn("Old password doesn't match: user=" + req.user.info.name + ", uid=" + uid);
        okHandler('updateLocalUserPassword', res, {
          'success': false,
          'message': "" + req.t("app.settings.pwdNok", {context: "serverFailureOldPwdWrong"})
        });
      }
    }).fail(function(err) {
      myFailureHandler(res, err);
    });
  } else {
    log.error("Non-local user cannot update password: user=" + req.user.info.name + ", uid=" + uid);
    res.sendStatus(500);
    res.end();
  }
});

app.get("/api/companies", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  log.info("Get companies: user=" + req.user.info.name + ", uid=" + uid);
  mydb.getCompanies(uid).then(function(docs) {
    res.status(200).json(docs);
    res.end();
  }).fail(myFailureHandler.bind(null, res));
});

app.get("/api/company/:id", ensureAuthenticated,
    function(req, res) {
      var uid = req.user._id;
      var id = req.params.id;
      log.info("Get company: user=" + req.user.info.name + ", uid=" + uid
          + ", _id=" + id);
      mydb.getCompany(uid, id).then(function(company) {
        res.status(200).json(company);
        res.end();
      }).fail(myFailureHandler.bind(null, res));
    });

app.put("/api/company/:id", ensureAuthenticated, function(req, res) {
  var okHandler = function(logText, res, company) {
    log.verbose(logText + ": OK, obj=" + JSON.stringify(company));
    var resData = {
      'company' : company
    };
    res.status(200).json(resData);
    res.end();
  };
  var uid = req.user._id;
  if (req.params.id === "undefined") {
    log.info("New company: user=" + req.user.info.name + ", uid=" + uid
        + ", data=" + JSON.stringify(req.body, null, 2));
    mydb.addCompany(uid, req.body)
        .then(okHandler.bind(null, 'addCompany', res)).fail(
            myFailureHandler.bind(null, res));
  } else {
    log.info("Update company: user=" + req.user.info.name + ", uid=" + uid
        + ", data=" + JSON.stringify(req.body, null, 2));
    // Remove nextIid and nextCid, we don't want to modify that
    // in case of concurrent invoice or customer creation!
    delete req.body.nextCid;
    delete req.body.nextIid;

    mydb.updateCompany(req.body).then(
        okHandler.bind(null, 'updateCompany', res)).fail(
        myFailureHandler.bind(null, res));
  }
});

app.post("/api/company_logo/:companyId", ensureAuthenticated, upload.single('logo'), function(req, res) {
  var uid = req.user._id;
  var companyId = req.params.companyId;
  log.info("Company logo upload: uid=" + uid + ", companyId=" + companyId +
      ", file: " + JSON.stringify(req.file));

  var company = {
    '_id': mydb.toObjectId(companyId),
    'uid': uid,
    'logo': {
      'mimetype': req.file.mimetype,
      'path': req.file.path,
      'originalname': req.file.originalname
    }
  };
  mydb.updateCompany(company).then(function(companyResponse) {
    log.verbose("Company logo set: " + JSON.stringify(companyResponse));
    var jsonRes = {
      'logo': companyResponse.logo
    };
    res.status(200).json(jsonRes);
    res.end();
  }).fail(
      myFailureHandler.bind(null, res));
});

app.get("/api/company_logo/:companyId", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  var companyId = req.params.companyId;
  log.info("Company logo get: uid=" + uid + ", companyId=" + companyId);

  mydb.getCompany(uid, companyId).then(function(company) {
    if (company.logo !== undefined && company.logo.path !== undefined) {
      var logoFilename = company.logo.path;
      log.verbose("Company logo for companyId=" + companyId + " path=" + logoFilename +
          ", mimetype=" + company.logo.mimetype);
      var options = {
        root: __dirname,
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
      };
      res.sendFile(logoFilename, options, function(err) {
        if (err) {
          log.error("Error sending company logo:" + err);
          res.status(err.status).end();
        }
        else {
          log.verbose("Company logo sent for companyId=" + companyId + " path=" + logoFilename);
        }
      });
    } else {
      log.warn("Company companyId=" + companyId + " has no configured logo!");
      res.status(404).end();
    }
  }).fail(
      myFailureHandler.bind(null, res));
});

app.get("/api/customers/:companyId", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  var companyId = req.params.companyId;
  log.info("Get customers: user=" + req.user.info.name + ", uid=" + uid
      + ", companyId=" + companyId);
  mydb.getCustomers(uid, companyId).then(function(docs) {
    res.status(200).json(docs);
    res.end();
  }).fail(myFailureHandler.bind(null, res));
});

app.get("/api/customer/:id", ensureAuthenticated,
    function(req, res) {
      var uid = req.user._id;
      var id = req.params.id;
      log.info("Get customer: user=" + req.user.info.name + ", uid=" + uid
          + ", _id=" + id);
      mydb.getCustomer(uid, id).then(function(customer) {
        res.status(200).json(customer);
        res.end();
      }).fail(myFailureHandler.bind(null, res));
    });

app.put("/api/customer/:id", ensureAuthenticated, function(req, res) {
  var okHandler = function(logText, res, customer) {
    log.verbose(logText + ": OK, obj=" + JSON.stringify(customer));
    var resData = {
      'customer' : customer
    };
    res.status(200).json(resData);
    res.end();
  };
  var uid = req.user._id;
  var companyId = req.body.companyId;
  if (req.params.id === "undefined") {
    log.info("New customer: user=" + req.user.info.name + ", uid=" + uid
        + ", data=" + JSON.stringify(req.body, null, 2));
    mydb.addCustomer(uid, companyId, req.body).then(
        okHandler.bind(null, 'addCustomer', res)).fail(
        myFailureHandler.bind(null, res));
  } else {
    log.info("Update customer: user=" + req.user.info.name + ", uid=" + uid
        + ", data=" + JSON.stringify(req.body, null, 2));
    mydb.updateCustomer(req.body).then(
        okHandler.bind(null, 'updateCustomer', res)).fail(
        myFailureHandler.bind(null, res));
  }
});

var streamJsonResponse = function(res, stream, onEndCallback) {
  res.setHeader("Content-Type", "application/json");
  res.write('[');
  var prefix = '';
  stream.on('data', function(item) {
    res.write(prefix + JSON.stringify(item));
    // First item won't have a prefix succeding will...
    prefix = ',';
  });
  stream.on('end', function() {
    res.write(']');
    res.end();
    onEndCallback();
  });
};

app.get("/api/invoices/:companyId", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  var companyId = req.params.companyId;
  log.info("Get invoices: user=" + req.user.info.name + ", uid=" + uid
      + ", companyId=" + companyId);
  mydb.getInvoices(uid, companyId).then(function(docStream) {
    streamJsonResponse(res, docStream, function() {
      docStream.close();
    });
  }).fail(myFailureHandler.bind(null, res));
});

app.get("/api/invoice/:id", ensureAuthenticated,
    function(req, res) {
      var uid = req.user._id;
      var id = req.params.id;
      log.info("Get invoice: user=" + req.user.info.name + ", uid=" + uid
          + ", _id=" + id);
      mydb.getInvoice(uid, id).then(function(invoice) {
        res.status(200).json(invoice);
        res.end();
      }).fail(myFailureHandler.bind(null, res));
    });

app.put("/api/invoice/:id", ensureAuthenticated, function(req, res) {
  var okHandler = function(logText, res, invoice) {
    log.verbose(logText + ": OK, obj=" + JSON.stringify(invoice));
    var resData = {
      'invoice' : invoice
    };
    res.status(200).json(resData);
    res.end();
  };
  var uid = req.user._id;
  var companyId = req.body.companyId;
  if (req.params.id === "undefined") {
    log.info("New invoice: user=" + req.user.info.name + ", uid=" + uid
        + ", data=" + JSON.stringify(req.body, null, 2));
    mydb.addInvoice(uid, companyId, req.body).then(
        okHandler.bind(null, 'addInvoice', res)).fail(
        myFailureHandler.bind(null, res));
  } else {
    log.info("Update invoice: user=" + req.user.info.name + ", uid=" + uid
        + ", data=" + JSON.stringify(req.body, null, 2));
    mydb.updateInvoice(req.body).then(
        okHandler.bind(null, 'updateInvoice', res)).fail(
        myFailureHandler.bind(null, res));
  }
});

app.get("/api/itemGroupTemplates", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  log.info("Get invoice item group templates: user=" + req.user.info.name + ", uid=" + uid);
  mydb.getItemGroupTemplates(uid).then(function(docs) {
    res.status(200).json(docs);
    res.end();
  }).fail(myFailureHandler.bind(null, res));
});

app.put("/api/itemGroupTemplate/:id", ensureAuthenticated, function(req, res) {
  var okHandler = function(logText, res, groupTempl) {
    log.verbose(logText + ": OK, obj=" + JSON.stringify(groupTempl));
    var resData = {
      'groupTempl' : groupTempl
    };
    res.status(200).json(resData);
    res.end();
  };
  var uid = req.user._id;
  if (req.params.id === "undefined") {
    log.info("New invoice item group template: user=" + req.user.info.name +
      ", uid=" + uid + ", data=" + JSON.stringify(req.body, null, 2));
    mydb.addItemGroupTemplate(uid, req.body)
        .then(okHandler.bind(null, 'addItemGroupTemplate', res)).fail(
            myFailureHandler.bind(null, res));
  } else {
    log.info("Update invoice item group template: user=" + req.user.info.name +
      ", uid=" + uid + ", data=" + JSON.stringify(req.body, null, 2));

    mydb.updateItemGroupTemplate(req.body).then(
        okHandler.bind(null, 'updateItemGroupTemplate', res)).fail(
        myFailureHandler.bind(null, res));
  }
});

app.get("/api/invoiceReport/:id/:isReminder", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  var id = req.params.id;
  var isReminder = (req.params.isReminder==="true")?true:false;
  log.info("Invoice report: user=" + req.user.info.name + ", _id=" + id + ", isReminder=" + isReminder);
  
  // Check license in settings
  var isDemoMode = false;
  var debug = false;
  mydb.getSettings(uid).then(function(settings) {
    if (settings.license === undefined ||
        settings.license === "demo") {
      isDemoMode = true;
    }
    log.info("Invoice report: user=" + req.user.info.name + ", _id=" + id +
        ", isDemoMode=" + isDemoMode);
    return mydb.getInvoice(uid, id);
  }).then(function(invoice) {
    reporter.doInvoiceReport(invoice, tmpDir, function(reportFilename) {
        log.verbose("onCompletion: reportFilename=" + reportFilename);
        res.type('application/pdf');
        res.download(reportFilename, reportFilename, function(err) {
          if (err) {
            log.error("onCompletion: " + err);
          } else {
            res.end();
          }
        });
      },
      {
        'isReminder': isReminder,
        'isDemoMode': isDemoMode,
        'debug': debug
      }
    );
  }).fail(myFailureHandler.bind(null, res));
});

app.get("/api/stats/:cid", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  var cid = req.params.cid;
  log.info("Statistics: user=" + req.user.info.name + ", cid=" + cid);
  
  mydb.getStats(uid, cid).then(function(stats) {
    log.verbose("Statistics: user=" + req.user.info.name + ", cid=" + cid, ", stats=" + JSON.stringify(stats));
    res.status(200).json(stats);
    res.end();
  }).fail(myFailureHandler.bind(null, res));
});

app.get("/api/userStats/:uid", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  var isAdmin = req.user.info.isAdmin;
  var reqForUid = req.params.uid;
  log.info("User statistics: user=" + req.user.info.name + ", requested for user uid=" + reqForUid + ", isAdmin=" + isAdmin);
  if (isAdmin === true) {
    mydb.getStats(reqForUid).then(function(stats) {
      log.verbose("User statistics: user=" + req.user.info.name + ", requested for user uid=" + reqForUid + ", stats=" + JSON.stringify(stats));
      res.status(200).json(stats);
      res.end();
    }).fail(myFailureHandler.bind(null, res));
  } else {
    log.error('ERROR: Non-admin user uid=' + uid + ', name=' + userName + ' requested user stats!');
    res.status(500);
    res.end();
  }
  
});

app.get("/api/users", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  var isAdmin = req.user.info.isAdmin;
  var userName = req.user.info.name;
  log.info("Get users: user=" + userName + ", uid=" + uid, ", isAdmin=" + isAdmin);
  if (isAdmin === true) {
    mydb.getUsers().then(function(docs) {
      res.status(200).json(docs);
      res.end();
    }).fail(myFailureHandler.bind(null, res));
  } else {
    log.error('ERROR: Non-admin user uid=' + uid + ', name=' + userName + ' requested user list!');
    res.status(500);
    res.end();
  }
});

app.get("/api/invites", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  var isAdmin = req.user.info.isAdmin;
  var userName = req.user.info.name;
  log.info("Get invites: user=" + userName + ", uid=" + uid, ", isAdmin=" + isAdmin);
  if (isAdmin === true) {
    mydb.getInvites().then(function(docs) {
      res.status(200).json(docs);
      res.end();
    }).fail(myFailureHandler.bind(null, res));
  } else {
    log.error('ERROR: Non-admin user uid=' + uid + ', name=' + userName + ' requested invite list!');
    res.status(500);
    res.end();
  }
});

app.get("/api/log", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  var isAdmin = req.user.info.isAdmin;
  var userName = req.user.info.name;
  log.info("Get log: user=" + userName + ", uid=" + uid, ", isAdmin=" + isAdmin);
  if (isAdmin === true) {
    res.type('text/plain');
    res.download(defaults.logFile, 'log.txt', function(err) {
      if (err) {
        log.error("Failed to get log: " + err);
      } else {
        res.end();
      }
    });
  } else {
    log.error('ERROR: Non-admin user uid=' + uid + ', name=' + userName + ' requested log!');
    res.status(500);
    res.end();
  }
});

// sends the request through our local signup strategy, and if successful takes
// user to homepage, otherwise returns then to signin page
app.post('/local-reg', passport.authenticate('local-signup', {
  successRedirect : '/',
  failureRedirect : '/signin',
  failureFlash: true
}));

// sends the request through our local login/signin strategy, and if successful
// takes user to homepage, otherwise returns then to signin page
app.post('/login', passport.authenticate('local-signin', {
  successRedirect : '/',
  failureRedirect : '/signin',
  failureFlash: true
}));

app.get('/loginAs/:uid', ensureAuthenticated, function(req, res) {
  var currentUid = req.user._id;
  var isAdmin = req.user.info.isAdmin;
  var userName = req.user.info.name;
  var loginAsUid = req.params.uid;
  log.info("Login as other user requested by: user=" + userName +
    ", uid=" + currentUid, ", isAdmin=" + isAdmin + ", loginAsUid=" + loginAsUid);
  if (isAdmin === true) {
    var ologinAsUid = mydb.toObjectId(loginAsUid);
    mydb.getUser({_id: ologinAsUid}).then(function(user) {
      log.verbose("Login as other user: user=" + userName + " requested to login as user=" + JSON.stringify(user));
      req.login(user, function(err) {
        if (err) { return next(err); }
        log.verbose("Login as other user: user=" + userName + " as user=" + user.info.name + " - success!");
        return res.redirect('/');
      });
    }).fail(myFailureHandler.bind(null, res));
  } else {
    log.error('ERROR: Non-admin user uid=' + currentUid + ', name=' + userName +
      ' requested to login as other user!');
    res.status(500);
    res.end();
  }
});

// logs user out of site, deleting them from the session, and returns to
// homepage
app.get('/logout', ensureAuthenticated, function(req, res) {
  var name = req.user.info.name;
  log.info("logout: email=" + req.user.info.email + ", name=" + req.user.info.name);
  req.logout();
  req.flash('notice', req.t("signin.logoutOkMsg", {name: name}));
  res.redirect('/signin');
});

var appTemplatePath = require.resolve('./views/app.marko');
var appTemplate = marko.load(appTemplatePath);

app.get('/', ensureAuthenticated, function(req, res) {
  var userInfo = req.user.info;
  // Only local users have a password...
  userInfo.isLocal = req.user.hasOwnProperty('username-local');
  userInfo._id = req.user._id;

  var msg =  {
      "error": req.flash('error'),
      "notice": req.flash('notice'),
      "success": req.flash('success')
    };
  appTemplate.render({
    msg : msg,
    user : userInfo
  }, res);
});

var signinTemplatePath = require.resolve('./views/signin.marko');
var signinTemplate = marko.load(signinTemplatePath);

app.get('/signin', function(req, res) {
  var msg =  {
    "error": req.flash('error'),
    "notice": req.flash('notice'),
    "success": req.flash('success'),
  };
  signinTemplate.render({
    msg : msg,
    lngList : defaults.uiEnabledLngList,
  }, res);
});

app.get('/auth/google',
    passport.authenticate('google', {
      scope : [
        'profile',
        'email'
      ]
    }));

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/signin', failureFlash: true}),
    function(req, res) {
      var greetingMsg;
      if (req.user.isNew) {
        greetingMsg = req.t("signin.registerOkMsg", {name: req.user.info.name});
      } else {
        greetingMsg = req.t("signin.loginOkMsg", {name: req.user.info.name});
      }
      req.flash('success', greetingMsg);
      // Successful authentication, redirect home.
      res.redirect('/');
    });

//start listening on port 8080
var server = require('./server');
var serverSettings = {
    port: 8080,
    ssl: {
      active: args.ssl,
      key: "keys/key.pem",
      certificate: "keys/cert.pem",
    }
};

server.create(serverSettings, app, function() {
  var protocol = "HTTP";
  if (serverSettings.ssl.active) {
    protocol = "HTTPS";
  }
  log.info('Started ' + protocol + ' server listening on port ' +
      serverSettings.port);
});

if (args.monitor) {
  var intervalMs = 15 * 60 * 1000; // Every 15 min
  setInterval(function() {
    var memUsage = process.memoryUsage();
    log.info("Memory usage: " + JSON.stringify(memUsage));
  }, intervalMs);
}