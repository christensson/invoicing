// Frameworks
var args = require('commander');
var express = require("express");
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var methodOverride = require('method-override');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var path = require('path');
var marko = require('marko');

function list(val) {
  return val.split(',');
}

args.version('0.0.1')
  .option('-l, --login <username,password>', 'Login with username and password', list)
  .parse(process.argv);

explicitUser = null;
if (args.login) {
    if (args.login.length == 2) {
        explicitUser = {
            username: args.login[0],
            password: args.login[1]
        }
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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));
app.use(express.static('node_modules/knockout/build/output'));
app.use(express.static('node_modules/bootstrap/js'));
app.use(express.static('node_modules/bootstrap/dist/js'));
app.use(express.static('node_modules/bootstrap/dist/css'));
app.use(express.static('node_modules/knockout-bootstrap/build'));
app.use(express.static('node_modules/bootstrap'));
app.use(express.static('node_modules/director/build'));
app.use(express.static('node_modules/jquery/dist'));

// Session-persisted message middleware
app.use(function(req, res, next){
  var err = req.session.error,
      msg = req.session.notice,
      success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err) res.locals.error = err;
  if (msg) res.locals.notice = msg;
  if (success) res.locals.success = success;

  next();
});

// App modules
var mydb = require('./mydb.js');
var reporter = require('./reporter.js');
var funct = require('./functions.js');

// Passport session setup.
passport.serializeUser(function(user, done) {
  console.log("serializing " + user.username);
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  console.log("deserializing " + obj);
  done(null, obj);
});

passport.use('local-signin', new LocalStrategy(
  {passReqToCallback : true}, //allows us to pass back the request to the callback
  function(req, username, password, done) {
    console.log("signin: user=" + username + ", pw=" + password);
    funct.localAuth(username, password)
    .then(function (user) {
      if (user) {
        console.log("LOGGED IN AS: " + user.username);
        req.session.success = 'You are successfully logged in ' + user.username + '!';
        done(null, user);
      }
      if (!user) {
        console.log("COULD NOT LOG IN");
        req.session.error = 'Could not log user in. Please try again.'; //inform user could not log them in
        done(null, user);
      }
    })
    .fail(function (err){
      console.log(err.body);
    });
  }
));

// Use the LocalStrategy within Passport to register/"signup" users.
passport.use('local-signup', new LocalStrategy(
  {passReqToCallback : true}, //allows us to pass back the request to the callback
  function(req, username, password, done) {
    console.log("signup: user=" + username + ", pw=" + password);
    funct.localReg(username, password)
    .then(function (user) {
      if (user) {
        console.log("REGISTERED: " + user.username);
        req.session.success = 'You are successfully registered and logged in ' + user.username + '!';
        done(null, user);
      }
      if (!user) {
        console.log("COULD NOT REGISTER");
        req.session.error = 'That username is already in use, please try a different one.'; //inform user could not log them in
        done(null, user);
      }
    })
    .fail(function (err) {
      console.log(err.body);
    });
  }
));

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
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
        console.log("ensureAuthenticated: Authenticated from command line using %j", explicitUser);
        req.user = {username: explicitUser.username};
        return next();
    }
}

function myFailureHandler(res, err) {
    var errorJson = {
        'name': err.name,
        'constructor': err.constructor,
        'message': err.message
    };
    console.error('ERROR: ' + JSON.stringify(errorJson));
    res.sendStatus(500);
    res.end();
}

app.get("/api/customers", ensureAuthenticated, function(req, res) {
    var uid = req.user._id;
    console.log("Get customers: user=" + req.user.username + ", uid=" + uid);
    mydb.getCustomers(uid)
        .then(function(docs) {
            res.status(200).json(docs);
            res.end();
        })
        .fail(myFailureHandler.bind(null, res));
});

app.put("/api/customer/:id", ensureAuthenticated, function(req, res) {
    var okHandler = function(logText, res, customer) {
        console.log(logText + ": OK, obj=" + JSON.stringify(customer));
        resData = {
            'customer': customer
        };
        res.status(200).json(resData);
        res.end();
    };
    var uid = req.user._id;
    if (req.params.id === "undefined") {
        console.log("New customer: user=" + req.user.username +
            ", uid=" + uid + ", data=" + JSON.stringify(req.body, null, 4));
        mydb.addCustomer(uid, req.body)
            .then(okHandler.bind(null, 'addCustomer', res))
            .fail(myFailureHandler.bind(null, res));
    } else {
        console.log("Update customer: user=" + req.user.username +
            ", uid=" + uid + ", data=" + JSON.stringify(req.body, null, 4));
        mydb.updateCustomer(req.body)
            .then(okHandler.bind(null, 'updateCustomer', res))
            .fail(myFailureHandler.bind(null, res));
    }
});

app.get("/api/customersReport", ensureAuthenticated, function(req, res) {
    var uid = req.user._id;
    console.log("Customers report: user=" + req.user.username + ", uid=" + uid);
    mydb.getCustomers(uid)
        .then(function(customers) {
            reporter.doCustomersReport(customers, function(reportFilename) {
                console.log("onCompletion: reportFilename=" + reportFilename);
                res.type('application/pdf');
                res.download(reportFilename, reportFilename, function(err) {
                    if (err) {
                        console.error("onCompletion: " + err);
                    } else {
                        res.end();
                    }
                });
            });
        })
        .fail(myFailureHandler.bind(null, res));
});

//sends the request through our local signup strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/local-reg', passport.authenticate('local-signup', {
    successRedirect: '/',
    failureRedirect: '/signin'
  })
);

//sends the request through our local login/signin strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/login', passport.authenticate('local-signin', { 
    successRedirect: '/',
    failureRedirect: '/signin'
  })
);

//logs user out of site, deleting them from the session, and returns to homepage
app.get('/logout', ensureAuthenticated, function(req, res){
  var name = req.user.username;
  console.log("LOGGIN OUT " + req.user.username)
  req.logout();
  req.session.notice = "You have successfully been logged out " + name + "!";
  res.redirect('/signin');
});

var appTemplatePath = require.resolve('./views/app.marko');
var appTemplate = marko.load(appTemplatePath);
 
app.get('/', ensureAuthenticated, function(req, res) {
  userInfo = {
    username: req.user.username
  }
  appTemplate.render({msg: res.locals, user: userInfo}, res);
});

var signinTemplatePath = require.resolve('./views/signin.marko');
var signinTemplate = marko.load(signinTemplatePath);

app.get('/signin', function(req, res) {
  signinTemplate.render({msg: res.locals}, res);
});

//start listening on port 3000
app.listen(3000);