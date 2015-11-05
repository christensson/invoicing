// functions.js/
var bcrypt = require('bcryptjs'),
    Q = require('q'),
    mydb = require('./mydb.js');

//used in local-signup strategy
exports.localReg = function (username, password, data) {
  var deferred = Q.defer();
  var hash = bcrypt.hashSync(password, 8);
  var user = {
    "username-local": username,
    "password": hash,
    "info" : data
  };
  //check if username is already assigned in our database
  mydb.getUser({"username-local": username}).then(function (result) { //case in which user already exists in db
    console.log('username already exists');
    deferred.resolve(false); //username already exists
  })
  .fail(function (result) {//case in which user does not already exist in db
      console.log("Didn't exist: " + JSON.stringify(result));
      if (result.message == 'The requested items could not be found.'){
        console.log('Username is free for use');
        mydb.addUser(user).then(function () {
          console.log("USER: " + JSON.stringify(user));
          mydb.initUserContext({"username-local": username}).then(function(addedUser) {
            deferred.resolve(addedUser);
          }).fail(function(err) {
            deferred.reject(new Error(err.body));
          });
        })
        .fail(function (err) {
          console.log("PUT FAIL:" + err.body);
          deferred.reject(new Error(err.body));
        });
      } else {
        deferred.reject(new Error(result.body));
      }
  });

  return deferred.promise;
};

//check if user exists
//if user exists check if passwords match (use bcrypt.compareSync(password, hash); // true where 'hash' is password in DB)
//if password matches take into website
//if user doesn't exist or password doesn't match tell them it failed
exports.localAuth = function (username, password) {
  var deferred = Q.defer();

  mydb.getUser({"username-local": username}).then(function (result){
    var hash = result.password;
    console.log("Found local user=" + result.info.name);
    if (bcrypt.compareSync(password, hash)) {
      deferred.resolve(result);
    } else {
      console.log("Password incorrect!");
      deferred.resolve(false);
    }
  }).fail(function (err){
    if (err.message == 'The requested items could not be found.') {
      console.log("Couldn't find user " + username + " in DB for signin!");
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
exports.findOrCreate = function(idField, userData) {
  var deferred = Q.defer();
  
  var query =  {};
  var userid = userData[idField];
  query[idField] = userid;
  
  console.log("findOrCreate: idField=" + idField + ", userid=" + userid +
      ", userData=" + JSON.stringify(userData) +
      ", query=" + JSON.stringify(query));

  mydb.getUser(query).then(function (user) {
    console.log("FOUND USER: _id=" + user._id + ", user=" + JSON.stringify(user));
    var result = {
        "user": user,
        "isNew": false,
    };
    deferred.resolve(result);
  }).fail(function (err) {
    if (err.message === 'The requested items could not be found.') {
      console.log("User with " + idField + "=" + userid + " doesn't exist! " +
          "Creating new user=" + JSON.stringify(userData));
      mydb.addUser(userData).then(function() {
        // Add success, retrieve user to return it...
        mydb.initUserContext(query).then(function(user) {
          var result = {
              "user": user,
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