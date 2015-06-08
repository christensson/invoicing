// functions.js/
var bcrypt = require('bcryptjs'),
    Q = require('q'),
    mydb = require('./mydb.js')

//used in local-signup strategy
exports.localReg = function (username, password) {
  var deferred = Q.defer();
  var hash = bcrypt.hashSync(password, 8);
  var user = {
    "username": username,
    "password": hash,
  }
  //check if username is already assigned in our database
  mydb.getUser(username)
  .then(function (result) { //case in which user already exists in db
    console.log('username already exists');
    deferred.resolve(false); //username already exists
  })
  .fail(function (result) {//case in which user does not already exist in db
      console.log("Didn't exist: " + JSON.stringify(result));
      if (result.message == 'The requested items could not be found.'){
        console.log('Username is free for use');
        mydb.addUser(user)
        .then(function () {
          console.log("USER: " + user);
          deferred.resolve(user);
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

  mydb.getUser(username)
  .then(function (result){
    var hash = result.password;
    console.log("FOUND USER: hash=" + hash);
    if (hash === "") {
      console.log("EMPTY PASSWORD HASH: any password accepted...");
      deferred.resolve(result);
    } else if (bcrypt.compareSync(password, hash)) {
      deferred.resolve(result);
    } else {
      console.log("PASSWORDS NOT MATCH");
      deferred.resolve(false);
    }
  }).fail(function (err){
    if (err.message == 'The requested items could not be found.') {
          console.log("COULD NOT FIND USER IN DB FOR SIGNIN");
          deferred.resolve(false);
    } else {
      deferred.reject(new Error(err));
    }
  });

  return deferred.promise;
}