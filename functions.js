'use strict';

// functions.js/
var bcrypt = require('bcryptjs');
var Q = require('q');
var mydb = require('./mydb.js');
var log = require('./log');

//check if user exists
//if user exists check if passwords match (use bcrypt.compareSync(password, hash); // true where 'hash' is password in DB)
//if password matches take into website
//if user doesn't exist or password doesn't match tell them it failed
exports.localAuth = function (username, password, markAccess) {
  var deferred = Q.defer();
  var getUserOpts = {includePassword: true, markAccess: markAccess};
  mydb.getUser({"username-local": username}, getUserOpts).then(function (result){
    var hash = result.password;
    delete result.password; // Do not expose password!
    bcrypt.compare(password, hash, function(err, res) {
      if (err) {
        deferred.reject(new Error(err));
      } else {
        if (res) {
          deferred.resolve(result);
        } else {
          log.verbose("localAuth: Password incorrect for local user=" + result.info.name);
          deferred.resolve(false);
        }
      }
    });
  }).fail(function (err){
    if (err.message == 'The requested items could not be found.') {
      log.verbose("localAuth: Couldn't find user " + username + " in DB for signin!");
      deferred.resolve(false);
    } else {
      deferred.reject(new Error(err));
    }
  });

  return deferred.promise;
};

//check if user exists
//if user exists check if passwords match (use bcrypt.compareSync(password, hash); // true where 'hash' is password in DB)
//if password matches take into website
//if user doesn't exist or password doesn't match tell them it failed
exports.findOrCreate = function(idField, userData, inviteInfo) {
  var deferred = Q.defer();
  
  var query =  {};
  var userid = userData[idField];
  query[idField] = userid;
  
  log.verbose("findOrCreate: idField=" + idField + ", userid=" + userid +
      ", userData=" + JSON.stringify(userData) +      
      ", query=" + JSON.stringify(query));
  var getUserOpts = {markAccess: true};
  mydb.getUser(query, getUserOpts).then(function (existingUser) {
    log.verbose("FOUND USER: _id=" + existingUser._id + ", user=" + JSON.stringify(existingUser));
    var result = {
        "user": existingUser,
        "isNew": false,
    };
    deferred.resolve(result);
  }).fail(function (err) {
    if (err.message === 'The requested items could not be found.') {
      log.verbose("User with " + idField + "=" + userid + " doesn't exist! " +
          "Creating new user=" + JSON.stringify(userData) +
          ", inviteInfo=" + JSON.stringify(inviteInfo));
      if (inviteInfo.isAdmin) {
        userData.info.isAdmin = true;
      }

      // Check that e-mail isn't registered before
      mydb.getUser({"info.email": userData.info.email}).then(function() {
        deferred.reject(new Error("Failed to create user, e-mail already registered!"));
      }).fail(function(err) {
        if (err.message === 'The requested items could not be found.') {
          return mydb.addUser(userData).then(function() {
            // Add success, retrieve user to return it...
            mydb.initUserContext(query, inviteInfo.license).then(function(newUser) {
              var result = {
                  "user": newUser,
                  "isNew": true,
              };  
              deferred.resolve(result);
            }).fail(function(error) {
              deferred.reject(error);
            }).done();
          });
        } else {
          log.verbose("findOrCreate: Unexpected error: " + JSON.stringify(err));
          deferred.reject(new Error(err));
        }
      }).done();
    } else {
      log.verbose("findOrCreate: Unexpected error: " + JSON.stringify(err));
      deferred.reject(new Error(err));
    }
  });

  return deferred.promise;
};

exports.encryptPassword = function(password) {
  return bcrypt.hashSync(password, 8);
}

exports.createUserInfo = function(name, email, isAdmin, regDate) {
  var todaysDate = new Date().toISOString().split("T")[0];
  isAdmin = typeof isAdmin !== 'undefined' ? isAdmin : false;
  regDate = typeof regDate !== 'undefined' ? regDate : todaysDate;
  var info = {
      "name": name,
      "email": email,
      "registrationDate": regDate,
      "isAdmin": isAdmin,
  };
  return info;
};