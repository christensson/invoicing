'use strict';

// functions.js/
var bcrypt = require('bcryptjs'),
    Q = require('q'),
    mydb = require('./mydb.js');

//check if user exists
//if user exists check if passwords match (use bcrypt.compareSync(password, hash); // true where 'hash' is password in DB)
//if password matches take into website
//if user doesn't exist or password doesn't match tell them it failed
exports.localAuth = function (username, password) {
  var deferred = Q.defer();

  mydb.getUser({"username-local": username}, true).then(function (result){
    var hash = result.password;
    delete result.password; // Do not expose password!
    if (bcrypt.compareSync(password, hash)) {
      deferred.resolve(result);
    } else {
      console.log("localAuth: Password incorrect for local user=" + result.info.name);
      deferred.resolve(false);
    }
  }).fail(function (err){
    if (err.message == 'The requested items could not be found.') {
      console.log("localAuth: Couldn't find user " + username + " in DB for signin!");
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
  
  console.log("findOrCreate: idField=" + idField + ", userid=" + userid +
      ", userData=" + JSON.stringify(userData) +      
      ", query=" + JSON.stringify(query));

  mydb.getUser(query).then(function (existingUser) {
    console.log("FOUND USER: _id=" + existingUser._id + ", user=" + JSON.stringify(existingUser));
    var result = {
        "user": existingUser,
        "isNew": false,
    };
    deferred.resolve(result);
  }).fail(function (err) {
    if (err.message === 'The requested items could not be found.') {
      console.log("User with " + idField + "=" + userid + " doesn't exist! " +
          "Creating new user=" + JSON.stringify(userData) +
          ", inviteInfo=" + JSON.stringify(inviteInfo));
      if (inviteInfo.isAdmin) {
        userData.info.isAdmin = true;
      }
      mydb.addUser(userData).then(function() {
        // Add success, retrieve user to return it...
        mydb.initUserContext(query, inviteInfo.license).then(function(newUser) {
          var result = {
              "user": newUser,
              "isNew": true,
          };
          deferred.resolve(result);
        }).fail(function(error) {
          deferred.reject(error);
        });
      }).fail(function() {
        deferred.reject(new Error("Failed to create non-existing user!"));
      });
    } else {
      console.log("findOrCreate: Unexpected error: " + JSON.stringify(err));
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