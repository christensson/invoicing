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
var simLatency = require('express-simulate-latency');
var bcrypt = require('bcryptjs');
var defaults = require('./public/default.js').get();

function list(val) {
  return val.split(',');
}

args.version('0.0.1')
  .option('-l, --login <username,password>', 'Login with username and password', list)
  .option('--sim_latency', 'Simulate network latency')
  .option('--ssl', 'Start server on https')
  .option('--monitor', 'Monitor used resources')
  .option('--local', 'Run on localhost')
  .parse(process.argv);

explicitUser = null;
if (args.login) {
  if (args.login.length == 2) {
    explicitUser = {
      username : args.login[0],
      password : args.login[1]
    };
  } else {
    console.error("Login requires both username and password");
    args.outputHelp();
    process.exit(1);
  }
}
if (explicitUser !== null) {
  console.log("Starting server with user: " + JSON.stringify(explicitUser));
}

var smallLag = undefined;
if (args.sim_latency) {
  console.log("Server started in NW latency simulation mode.");
  smallLag = simLatency({ min: 500, max: 1000 });
}

var tmpDir = __dirname + "/tmp";

app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended : true
}));
app.use(cookieParser());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({
  secret : '345jlfe9324jfsdl2093xc',
  resave : false,
  saveUninitialized : false
}));
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

if (smallLag != undefined) {
  app.use(smallLag);
}

var upload = multer({
  dest: './uploads/',
  limits: {fileSize: 256*1024} // Max 256 Kbyte
});

// i18n
i18n.init({
  lng: defaults.defaultLng,
  preload: defaults.enabledLngList,
  lngWhitelist: defaults.enabledLngList,
  fallbackLng: [defaults.defaultLng],
  saveMissing: false,
  debug: true,
  ignoreRoutes: ['uploads/', 'public/img/', 'public/', 'views/']
});

app.use(i18n.handle);
i18n.registerAppHelper(app);
i18n.serveClientScript(app)      // grab i18next.js in browser
  .serveDynamicResources(app)    // route which returns all resources in on response
  .serveMissingKeyRoute(app)     // route to send missing keys
  .serveChangeKeyRoute(app)      // route to post value changes
  .serveRemoveKeyRoute(app);     // route to remove key/value

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
  console.log("serializing " + user.info.name);
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  console.log("deserializing " + obj);
  done(null, obj);
});

passport.use(
    'local-signin',
    new LocalStrategy(
        {
          passReqToCallback : true
        }, // allows us to pass back the request to the callback
        function(req, username, password, done) {
          console.log("signin: user=" + username + ", pw=" + password);
          funct.localAuth(username, password).then(
              function(user) {
                if (user) {
                  console.log("LOGGED IN AS: " + user.info.name);
                  req.flash('success', i18n.t("signin.loginOkMsg", {name: user.info.name}));
                  done(null, user);
                }
                if (!user) {
                  console.log("COULD NOT LOG IN");
                  req.flash('error', i18n.t("signin.loginNokMsg", {context: "local"}));
                  done(null, user);
                }
              }).fail(function(err) {
                console.log(err.body);
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
          console.log("signup: user=" + username);
          var hash = bcrypt.hashSync(password, 8);
          var userData = {
            "username-local": username, // username is e-mail for local users!
            "password": hash,
            "info" : funct.createUserInfo(req.body.fullName, username)
          };
          var errorMessage = i18n.t("signin.registerNokMsg", {email: userData.info.email, context: "notInvited"});
          mydb.isEmailInvited(userData.info.email).then(function(inviteInfo) {
            errorMessage = i18n.t("signin.registerNokMsg");
            return funct.findOrCreate("username-local", userData, inviteInfo);
          }).then(function(result) {
            if (result.user) {
              if (result.isNew) {
                req.flash('success', i18n.t("signin.registerOkMsg", {name: result.user.info.name}));
                done(null, result.user);
              } else {
                // Failure, registration doesn't expect user to exist.
                done(null, false, {message: i18n.t("signin.registerNokMsg", {name: username, context: "userExists"})});
              }
              return done(null, result.user);
            } else {
              console.log("Registration failed.");
              done(null, false, {message: errorMessage});
            }
          }).fail(function(error) {
            console.log("ERROR: " + error.message);
            done(null, false, {message: errorMessage});
          });
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
        console.log("Google-auth: profile=" + JSON.stringify(profile));
        var userData = {
            "googleId" : profile.id,
            "info" : funct.createUserInfo(profile.displayName, profile.emails[0].value)
        };
        mydb.isEmailInvited(userData.info.email).fail(function(error) {
          console.log("ERROR: " + error.message);
          done(null, false, {
            message: i18n.t("signin.registerNokMsg", {email: userData.info.email, context: "notInvited"})});
        }).then(function(inviteInfo) {
          return funct.findOrCreate("googleId", userData, inviteInfo);
        }).then(function(result) {
          if (result.user) {
            if (result.isNew) {
              result.user.greetingMsg = i18n.t("signin.registerOkMsg", {name: result.user.info.name});
            } else {
              result.user.greetingMsg = i18n.t("signin.loginOkMsg", {name: result.user.info.name});
            }
            return done(null, result.user);
          } else {
            console.log("Google authentication failed.");
            done(null, false);
          }
        }).fail(function(error) {
          console.log("ERROR: " + error.message);
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
  if (explicitUser == null) {
    if (req.isAuthenticated()) {
      console.log("ensureAuthenticated: Authenticated!");
      return next();
    }
    console.log("ensureAuthenticated: Not authenticated!");
    req.flash('error', i18n.t("signin.authNokMsg"));
    res.redirect('/signin');
  } else {
    console.log(
        "ensureAuthenticated: Authenticated from command line using %j",
        explicitUser);
    req.user = {
      username : explicitUser.name
    };
    return next();
  }
}

function myFailureHandler(res, err) {
  var errorJson = {
    'name' : err.name,
    'constructor' : err.constructor,
    'message' : err.message
  };
  console.error('ERROR: ' + JSON.stringify(errorJson));
  res.sendStatus(500);
  res.end();
}

app.get("/api/settings", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  console.log("Get settings: user=" + req.user.info.name + ", uid=" + uid);
  mydb.getSettings(uid).then(function(doc) {
    res.status(200).json(doc);
    res.end();
  }).fail(myFailureHandler.bind(null, res));
});

app.put("/api/settings", ensureAuthenticated, function(req, res) {
  var okHandler = function(logText, res, settings) {
    console.log(logText + ": OK, obj=" + JSON.stringify(settings));
    resData = {
      'settings' : settings
    };
    res.status(200).json(resData);
    res.end();
  };
  var uid = req.user._id;
  console.log("Update settings: user=" + req.user.info.name + ", uid=" + uid
      + ", settings=" + JSON.stringify(req.body));
  mydb.updateSettings(uid, req.body).then(
      okHandler.bind(null, 'updateSettings', res)).fail(
      myFailureHandler.bind(null, res));
});

app.get("/api/companies", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  console.log("Get companies: user=" + req.user.info.name + ", uid=" + uid);
  mydb.getCompanies(uid).then(function(docs) {
    res.status(200).json(docs);
    res.end();
  }).fail(myFailureHandler.bind(null, res));
});

app.get("/api/company/:id", ensureAuthenticated,
    function(req, res) {
      var uid = req.user._id;
      var id = req.params.id;
      console.log("Get company: user=" + req.user.info.name + ", uid=" + uid
          + ", _id=" + id);
      mydb.getCompany(uid, id).then(function(company) {
        res.status(200).json(company);
        res.end();
      }).fail(myFailureHandler.bind(null, res));
    });

app.put("/api/company/:id", ensureAuthenticated, function(req, res) {
  var okHandler = function(logText, res, company) {
    console.log(logText + ": OK, obj=" + JSON.stringify(company));
    resData = {
      'company' : company
    };
    res.status(200).json(resData);
    res.end();
  };
  var uid = req.user._id;
  if (req.params.id === "undefined") {
    console.log("New company: user=" + req.user.info.name + ", uid=" + uid
        + ", data=" + JSON.stringify(req.body, null, 4));
    mydb.addCompany(uid, req.body)
        .then(okHandler.bind(null, 'addCompany', res)).fail(
            myFailureHandler.bind(null, res));
  } else {
    console.log("Update company: user=" + req.user.info.name + ", uid=" + uid
        + ", data=" + JSON.stringify(req.body, null, 4));
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
  console.log("Company logo upload: uid=" + uid + ", companyId=" + companyId +
      ", file: " + JSON.stringify(req.file));
  console.log("company_log: path = " + req.file.path +
      ", originalname=" + req.file.originalname +
      ", mimetype=" + req.file.mimetype +
      ", size=" + req.file.size);

  mydb.getCompany(uid, companyId).then(function(company) {
    var logoInfo = {
      'mimetype': req.file.mimetype,
      'path': req.file.path,
      'originalname': req.file.originalname
    };
    company.logo = logoInfo;
    return mydb.updateCompany(company);
  }).then(function(company) {
    console.log("Company logo set: " + JSON.stringify(company));
    var jsonRes = {
      'logo': company.logo
    };
    res.status(200).json(jsonRes);
    res.end();
  }).fail(
      myFailureHandler.bind(null, res));
});

app.get("/api/company_logo/:companyId", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  var companyId = req.params.companyId;
  console.log("Company logo get: uid=" + uid + ", companyId=" + companyId);

  mydb.getCompany(uid, companyId).then(function(company) {
    if (company.logo !== undefined && company.logo.path !== undefined) {
      var logoFilename = company.logo.path;
      console.log("Company logo for companyId=" + companyId + " path=" + logoFilename +
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
          console.log("Error sending company logo:" + err);
          res.status(err.status).end();
        }
        else {
          console.log("Company logo sent for companyId=" + companyId + " path=" + logoFilename);
        }
      });
    } else {
      console.log("Company companyId=" + companyId + " has no configured logo!");
      res.status(404).end();
    }
  }).fail(
      myFailureHandler.bind(null, res));
});

app.get("/api/customers/:companyId", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  var companyId = req.params.companyId;
  console.log("Get customers: user=" + req.user.info.name + ", uid=" + uid
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
      console.log("Get customer: user=" + req.user.info.name + ", uid=" + uid
          + ", _id=" + id);
      mydb.getCustomer(uid, id).then(function(customer) {
        res.status(200).json(customer);
        res.end();
      }).fail(myFailureHandler.bind(null, res));
    });

app.put("/api/customer/:id", ensureAuthenticated, function(req, res) {
  var okHandler = function(logText, res, customer) {
    console.log(logText + ": OK, obj=" + JSON.stringify(customer));
    resData = {
      'customer' : customer
    };
    res.status(200).json(resData);
    res.end();
  };
  var uid = req.user._id;
  var companyId = req.body.companyId;
  if (req.params.id === "undefined") {
    console.log("New customer: user=" + req.user.info.name + ", uid=" + uid
        + ", data=" + JSON.stringify(req.body, null, 4));
    mydb.addCustomer(uid, companyId, req.body).then(
        okHandler.bind(null, 'addCustomer', res)).fail(
        myFailureHandler.bind(null, res));
  } else {
    console.log("Update customer: user=" + req.user.info.name + ", uid=" + uid
        + ", data=" + JSON.stringify(req.body, null, 4));
    mydb.updateCustomer(req.body).then(
        okHandler.bind(null, 'updateCustomer', res)).fail(
        myFailureHandler.bind(null, res));
  }
});

app.get("/api/invoices/:companyId", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  var companyId = req.params.companyId;
  console.log("Get invoices: user=" + req.user.info.name + ", uid=" + uid
      + ", companyId=" + companyId);
  mydb.getInvoices(uid, companyId).then(function(docs) {
    res.status(200).json(docs);
    res.end();
  }).fail(myFailureHandler.bind(null, res));
});

app.get("/api/invoice/:id", ensureAuthenticated,
    function(req, res) {
      var uid = req.user._id;
      var id = req.params.id;
      console.log("Get invoice: user=" + req.user.info.name + ", uid=" + uid
          + ", _id=" + id);
      mydb.getInvoice(uid, id).then(function(invoice) {
        res.status(200).json(invoice);
        res.end();
      }).fail(myFailureHandler.bind(null, res));
    });

app.put("/api/invoice/:id", ensureAuthenticated, function(req, res) {
  var okHandler = function(logText, res, invoice) {
    console.log(logText + ": OK, obj=" + JSON.stringify(invoice));
    resData = {
      'invoice' : invoice
    };
    res.status(200).json(resData);
    res.end();
  };
  var uid = req.user._id;
  var companyId = req.body.companyId;
  if (req.params.id === "undefined") {
    console.log("New invoice: user=" + req.user.info.name + ", uid=" + uid
        + ", data=" + JSON.stringify(req.body, null, 4));
    mydb.addInvoice(uid, companyId, req.body).then(
        okHandler.bind(null, 'addInvoice', res)).fail(
        myFailureHandler.bind(null, res));
  } else {
    console.log("Update invoice: user=" + req.user.info.name + ", uid=" + uid
        + ", data=" + JSON.stringify(req.body, null, 4));
    mydb.updateInvoice(req.body).then(
        okHandler.bind(null, 'updateInvoice', res)).fail(
        myFailureHandler.bind(null, res));
  }
});

app.get("/api/itemGroupTemplates", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  console.log("Get invoice item group templates: user=" + req.user.info.name + ", uid=" + uid);
  mydb.getItemGroupTemplates(uid).then(function(docs) {
    res.status(200).json(docs);
    res.end();
  }).fail(myFailureHandler.bind(null, res));
});

app.put("/api/itemGroupTemplate/:id", ensureAuthenticated, function(req, res) {
  var okHandler = function(logText, res, groupTempl) {
    console.log(logText + ": OK, obj=" + JSON.stringify(groupTempl));
    resData = {
      'groupTempl' : groupTempl
    };
    res.status(200).json(resData);
    res.end();
  };
  var uid = req.user._id;
  if (req.params.id === "undefined") {
    console.log("New invoice item group template: user=" + req.user.info.name +
      ", uid=" + uid + ", data=" + JSON.stringify(req.body, null, 4));
    mydb.addItemGroupTemplate(uid, req.body)
        .then(okHandler.bind(null, 'addItemGroupTemplate', res)).fail(
            myFailureHandler.bind(null, res));
  } else {
    console.log("Update invoice item group template: user=" + req.user.info.name +
      ", uid=" + uid + ", data=" + JSON.stringify(req.body, null, 4));

    mydb.updateItemGroupTemplate(req.body).then(
        okHandler.bind(null, 'updateItemGroupTemplate', res)).fail(
        myFailureHandler.bind(null, res));
  }
});

app.get("/api/invoiceReport/:id", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  var id = req.params.id;
  console.log("Invoice report: user=" + req.user.info.name + ", _id=" + id);
  
  // Check license in settings
  var isDemoMode = false;
  var debug = false;
  mydb.getSettings(uid).then(function(settings) {
    if (settings.license === undefined ||
        settings.license === "demo") {
      isDemoMode = true;
    }
    console.log("Invoice report: user=" + req.user.info.name + ", _id=" + id +
        ", isDemoMode=" + isDemoMode);
    return mydb.getInvoice(uid, id);
  }).then(function(invoice) {
    reporter.doInvoiceReport(invoice, tmpDir, function(reportFilename) {
        console.log("onCompletion: reportFilename=" + reportFilename);
        res.type('application/pdf');
        res.download(reportFilename, reportFilename, function(err) {
          if (err) {
            console.error("onCompletion: " + err);
          } else {
            res.end();
          }
        });
      },
      isDemoMode,
      debug);
  }).fail(myFailureHandler.bind(null, res));
});

app.get("/api/stats/:cid", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  var cid = req.params.cid;
  console.log("Statistics: user=" + req.user.info.name + ", cid=" + cid);
  
  mydb.getStats(uid, cid).then(function(stats) {
    console.log("Statistics: user=" + req.user.info.name + ", cid=" + cid, ", stats=" + JSON.stringify(stats));
    res.status(200).json(stats);
    res.end();
  }).fail(myFailureHandler.bind(null, res));
});

app.get("/api/userStats/:uid", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  var isAdmin = req.user.info.isAdmin;
  var reqForUid = req.params.uid;
  console.log("User statistics: user=" + req.user.info.name + ", requested for user uid=" + reqForUid + ", isAdmin=" + isAdmin);
  if (isAdmin) {
    mydb.getStats(reqForUid).then(function(stats) {
      console.log("User statistics: user=" + req.user.info.name + ", requested for user uid=" + reqForUid + ", stats=" + JSON.stringify(stats));
      res.status(200).json(stats);
      res.end();
    }).fail(myFailureHandler.bind(null, res));
  } else {
    console.error('ERROR: Non-admin user uid=' + uid + ', name=' + userName + ' requested user stats!');
    res.status(500);
    res.end();
  }
  
});

app.get("/api/users", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  var isAdmin = req.user.info.isAdmin;
  var userName = req.user.info.name;
  console.log("Get users: user=" + userName + ", uid=" + uid, ", isAdmin=" + isAdmin);
  if (isAdmin) {
    mydb.getUsers().then(function(docs) {
      res.status(200).json(docs);
      res.end();
    }).fail(myFailureHandler.bind(null, res));
  } else {
    console.error('ERROR: Non-admin user uid=' + uid + ', name=' + userName + ' requested user list!');
    res.status(500);
    res.end();
  }
});

app.get("/api/invites", ensureAuthenticated, function(req, res) {
  var uid = req.user._id;
  var isAdmin = req.user.info.isAdmin;
  var userName = req.user.info.name;
  console.log("Get invites: user=" + userName + ", uid=" + uid, ", isAdmin=" + isAdmin);
  if (isAdmin) {
    mydb.getInvites().then(function(docs) {
      res.status(200).json(docs);
      res.end();
    }).fail(myFailureHandler.bind(null, res));
  } else {
    console.error('ERROR: Non-admin user uid=' + uid + ', name=' + userName + ' requested invite list!');
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

// logs user out of site, deleting them from the session, and returns to
// homepage
app.get('/logout', ensureAuthenticated, function(req, res) {
  var name = req.user.info.name;
  console.log("LOGGIN OUT " + req.user.info.name);
  req.logout();
  req.flash('notice', i18n.t("signin.logoutOkMsg", {name: name}));
  res.redirect('/signin');
});

var appTemplatePath = require.resolve('./views/app.marko');
var appTemplate = marko.load(appTemplatePath);

app.get('/', ensureAuthenticated, function(req, res) {
  var userInfo = req.user.info;
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
  var currentLng = req.locale;
  console.log("signing: currentLng=" + currentLng);
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
    passport.authenticate('google', { scope : ['https://www.googleapis.com/auth/plus.login', 'https://www.googleapis.com/auth/userinfo.email'] }));

app.get('/auth/google/callback', 
    passport.authenticate('google', { successRedirect: '/', failureRedirect: '/signin', failureFlash: true}),
    function(req, res) {
      req.flash('success', req.user.greetingMsg);
      // Successful authentication, redirect home.
      res.redirect('/');
    },
    function(req, res) {
      console.log("Login using google account failed! req=" + JSON.stringify(req));
      req.flash('error', i18n.t("signin.loginNokMsg", {context: "google"}));
      // Failed authentication, redirect to login.
      res.redirect(401, '/signin');
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
  console.log('Started ' + protocol + ' server listening on port ' +
      serverSettings.port);
});

if (args.monitor) {
  var intervalMs = 15 * 60 * 1000; // Every 15 min
  setInterval(function() {
    var memUsage = process.memoryUsage();
    console.log("Memory usage: " + JSON.stringify(memUsage));
  }, intervalMs);
}