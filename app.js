//Frameworks
var args = require('commander');
var express = require("express");
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var methodOverride = require('method-override');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var path = require('path');
var marko = require('marko');
var multer = require('multer');
var i18n = require('i18next');

function list(val) {
  return val.split(',');
}

args.version('0.0.1').option('-l, --login <username,password>',
    'Login with username and password', list).parse(process.argv);

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

app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended : true
}));
app.use(cookieParser());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({
  secret : 'keyboard cat',
  resave : false,
  saveUninitialized : false
}));
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

var upload = multer({
  dest: './uploads/',
  limits: {fileSize: 256*1024} // Max 256 Kbyte
});

// Session-persisted message middleware
app.use(function(req, res, next) {
  var err = req.session.error, msg = req.session.notice, success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err)
    res.locals.error = err;
  if (msg)
    res.locals.notice = msg;
  if (success)
    res.locals.success = success;

  next();
});

// i18n
i18n.init({
  preload: ['sv', 'en'],
  supportedLngs: ['en', 'sv'],
  saveMissing: true,
  debug: true,
  ignoreRoutes: ['uploads/', 'public/img/', 'public/', 'views/']}
/*, function(t) {
  // after initialisation with preloading needed languages
  // you could add localizable routes:
  i18n.addRoute('/:lng/route.products/route.harddrives/route.overview', ['sv', 'en'], app, 'get', function(req, res) {
    // res.send(...);
  });
}*/);

app.use(i18n.handle);
i18n.registerAppHelper(app);
i18n.serveClientScript(app)      // grab i18next.js in browser
  .serveDynamicResources(app)    // route which returns all resources in on response
  .serveMissingKeyRoute(app)     // route to send missing keys
  .serveChangeKeyRoute(app)      // route to post value changes
  .serveRemoveKeyRoute(app);     // route to remove key/value

// App modules
var mydb = require('./mydb.js');
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
                  req.session.success = 'You are successfully logged in '
                    + user.info.name + '!';
                  done(null, user);
                }
                if (!user) {
                  console.log("COULD NOT LOG IN");
                  req.session.error = 'Could not log user in. Please try again.';
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
          console.log("signup: user=" + username + ", pw=" + password);
          info = {
              "name": req.body.fullName,
              "email": req.body.email,
          };
          funct.localReg(username, password, info).then(
              function(user) {
                if (user) {
                  console.log("REGISTERED: " + user.info.name);
                  req.session.success = 'You are successfully registered and logged in '
                    + user.info.name + '!';
                  done(null, user);
                } else {
                  console.log("COULD NOT REGISTER");
                  req.session.error = 'That username is already in use, please try a different one.';
                  done(null, user);
                }
              }).fail(function(err) {
                console.log(err.body);
              });
        }));

passport.use(new GoogleStrategy(
    {
      /* Three things below must be configured at https://console.developers.google.com/
       * Also the "Google+ API" needs to be enabled.
       */
      clientID: googleAuth.web.client_id,
      clientSecret: googleAuth.web.client_secret,
      callbackURL: "/auth/google/callback"
    },
    function(accessToken, refreshToken, profile, done) {
      process.nextTick(function () {
        console.log("Google-auth: profile=" + JSON.stringify(profile));
        var userData = {
            "googleId" : profile.id,
            "info" : {
              "name" : profile.displayName,
              "email" : profile.emails[0].value, // pull the first email
            }
        };
        funct.findOrCreate("googleId", userData).then(function(result) {
          if (result.user) {
            if (result.isNew) {
              result.user.greetingMsg = 'You are successfully registered and logged in '
                + result.user.info.name + '!';
            } else {
              result.user.greetingMsg = 'You are successfully logged in '
                  + result.user.info.name + '!';
            }
            return done(null, result.user);
          } else {
            console.log("Google authentication failed.");
            done(new Error("Google authentication failed"), null);
          }
        }).fail(function(error) {
          done(error, null);
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
    req.session.error = 'Please sign in!';
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
    res.status(204).end();
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
    reporter.doInvoiceReport(invoice, function(reportFilename) {
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

// sends the request through our local signup strategy, and if successful takes
// user to homepage, otherwise returns then to signin page
app.post('/local-reg', passport.authenticate('local-signup', {
  successRedirect : '/',
  failureRedirect : '/signin'
}));

// sends the request through our local login/signin strategy, and if successful
// takes user to homepage, otherwise returns then to signin page
app.post('/login', passport.authenticate('local-signin', {
  successRedirect : '/',
  failureRedirect : '/signin'
}));

// logs user out of site, deleting them from the session, and returns to
// homepage
app.get('/logout', ensureAuthenticated, function(req, res) {
  var name = req.user.info.name;
  console.log("LOGGIN OUT " + req.user.info.name);
  req.logout();
  req.session.notice = "You have successfully been logged out " + name + "!";
  res.redirect('/signin');
});

var appTemplatePath = require.resolve('./views/app.marko');
var appTemplate = marko.load(appTemplatePath);

app.get('/', ensureAuthenticated, function(req, res) {
  userInfo = {
    username : req.user.info.name
  };
  appTemplate.render({
    msg : res.locals,
    user : userInfo
  }, res);
});

var signinTemplatePath = require.resolve('./views/signin.marko');
var signinTemplate = marko.load(signinTemplatePath);

app.get('/signin', function(req, res) {
  var currentLng = req.locale;
  console.log("signing: currentLng=" + currentLng);
  signinTemplate.render({
    msg : res.locals
  }, res);
});

app.get('/auth/google',
    passport.authenticate('google', { scope : ['https://www.googleapis.com/auth/plus.login', 'https://www.googleapis.com/auth/userinfo.email'] }));

app.get('/auth/google/callback', 
    passport.authenticate('google'),
    function(req, res) {
      req.session.success = req.user.greetingMsg;
      // Successful authentication, redirect home.
      res.redirect('/');
    },
    function(req, res) {
      console.log("Login using google account failed! req=" + JSON.stringify(req));
      req.session.success = 'Login using Google account failed!';
      // Failed authentication, redirect to login.
      res.redirect(401, '/signin');
    });

//start listening on port 3000
app.listen(3000);
