mongodb = require('mongodb');
Q = require('q');
var ObjectID = mongodb.ObjectID;

var generate_mongo_url = function(obj){
  obj.hostname = (obj.hostname || 'localhost');
  obj.port = (obj.port || 27017);
  obj.db = (obj.db || 'test');

  if(obj.username && obj.password){
    return "mongodb://" + obj.username + ":" + obj.password + "@" + obj.hostname + ":" + obj.port + "/" + obj.db;
  }
  else{
    return "mongodb://" + obj.hostname + ":" + obj.port + "/" + obj.db;
  }
}

var mongo = {
    "hostname":"localhost",
    "port":27017,
    "username":"",
    "password":"",
    "name":"",
    "db":"mydb"}

var mongourl = generate_mongo_url(mongo);

function dbop(opfunc) {
  mongodb.connect(mongourl, function(err, db){
    if (err) {
        console.error("Error: " + err);
    }
    else {
        opfunc(db);
    }
  });
}

function dbopPromise() {
  var deferred = Q.defer();
  mongodb.connect(mongourl, function(err, db) {
    if (err) {
        deferred.reject(new Error(err));
    }
    else {
        deferred.resolve(db);
    }
  });
  return deferred.promise;
}

function getAllDocsPromise(collectionName, filter) {
    return dbopPromise().then(function(db) {
        var deferred = Q.defer();
        var custColl = db.collection(collectionName);
        custColl.find(filter).toArray(function(err, docs) {
            if (err) {
                deferred.reject(
                    new Error("Error: getAllDocs(" + collectionName + "): " + err));
            } else {
                console.log("getAllDocs(" + collectionName +
                    ", filter=" + JSON.stringify(filter) + "): docs: " + JSON.stringify(docs));
                deferred.resolve(docs);
            }
        });
        return deferred.promise;
    });
}

function getOneDocPromise(collectionName, filter) {
    return dbopPromise().then(function(db) {
        var deferred = Q.defer();
        var custColl = db.collection(collectionName);
        custColl.findOne(filter, function(err, doc) {
            if (err) {
                deferred.reject(
                    new Error("Error: getOneDoc(" + collectionName + "): " + err));
            } else {
                console.log("getOneDoc(" + collectionName + "): doc: " + JSON.stringify(doc));
                deferred.resolve(doc);
            }
        });
        return deferred.promise;
    });
}

function dropCollectionPromise(collectionName) {
    return dbopPromise().then(function (db) {
        var deferred = Q.defer();
        db.collection(collectionName, function(err, coll) {
            if (err) {
                deferred.reject(
                    new Error("Error: dropCollection(" + collectionName + "): " + err));
            } else {
                coll.drop(function(err, reply) {
                    if (err) {
                        deferred.reject(
                            new Error("Error: dropCollection(" + collectionName + "): " + err));
                    }
                    if (reply) {
                        console.log(
                            "dropCollection(" + collectionName + "): success");
                        deferred.resolve(true);
                    } else {
                        deferred.reject(
                            new Error("Error: dropCollection(" + collectionName + "): reply=" + reply));
                    }
                });
            }
        });
        return deferred.promise;
   });
}

function insertData(collectionName, data, handleInsertResponse) {
    dbop(function (db) {
      db.collection(collectionName, function(err, coll) {
        if (err) {
            return console.error("insertData(" + collectionName + "): " + err);
        }
        console.log("insertData(" + collectionName + "): " + JSON.stringify(data, null, 4));
        coll.insert(data, {}, handleInsertResponse);
      });
    });
}

function insertDataPromise(collectionName, data) {
    return dbopPromise().then(function(db) {
        var deferred = Q.defer();
        db.collection(collectionName, function(err, coll) {
            if (err) {
                deferred.reject(
                    new Error("insertData(" + collectionName + "): " + err));
            } else {
                console.log("insertData(" + collectionName + "): " + JSON.stringify(data, null, 4));
                coll.insert(data, {serializeFunctions: true}, function(err) {
                    if(err) {
                        deferred.reject(
                            new Error("insertData(" + collectionName + "): " + err));
                    } else {
                        console.log("insertData(" + collectionName + "): success");
                        deferred.resolve(true);
                    }
                });
            }
        });
        return deferred.promise;
    });
}

function updateDataPromise(collectionName, data) {
    return dbopPromise().then(function (db) {
        var deferred = Q.defer();
        db.collection(collectionName, function(err, coll) {
            if (err) {
                deferred.reject(
                    new Error("updateData(" + collectionName + "): " + err));
            } else {
                console.log("updateData(" + collectionName + "): _id=" + data._id + ", data=" + JSON.stringify(data, null, 4));
                // _id in db is really an ObjectId, but it got lost in all the JSON mangling...
                data._id = new ObjectID(data._id);
                coll.update(
                    {_id: data._id}, //query
                    data, //update
                    {}, //options
                    function(err, obj) {
                        if (err) {
                            deferred.reject(
                                new Error("updateData(" + collectionName + "): " + err));
                        } else {
                            deferred.resolve(data);
                        }
                    }
                );
            }
        });
        return deferred.promise;
    });
}

function getNextSequencePromise(name) {
    return dbopPromise().then(function (db) {
        var deferred = Q.defer();
        var coll = db.collection("counters");
        coll.findAndModify(
            { _id: name }, //query
            [], //sort
            { $inc: { seq: 1 } }, //update
            { new: false }, //options
            function(err, obj) {
                if(err) {
                    deferred.reject(
                        new Error("getNextSequence(" + name + "): " + err));
                } else {
                    console.log("getNextSequence(" + name + "): success");
                    deferred.resolve(obj.value.seq);
                }
            }
        );
        return deferred.promise;
    });
}

module.exports.init = function() {
    // Counters
    dropCollectionPromise("counters")
        .then(function() {
            var counterList = [
                {
                    _id: "cid",
                    seq: 103
                },
                {
                    _id: "iid",
                    seq: 1003
                }
            ];
            return insertDataPromise("counters", counterList);
        })
        .done();

    // Users
    var machUserId = undefined;
    var testUserId = undefined;
    dropCollectionPromise("users")
        .then(function() {
            var userList = [
                {
                    username: "mach",
                    //password is "mach"
                    password: "$2a$08$3IwByU08C2BdgvwuvMec.eD3ugRp7oRpPHpuRwAOY1q0D8YUiSIYa"
                },
                {
                    username: "test",
                    //password is "test"
                    password: "$2a$08$8XE3C/OGbaT6v2PvonVqTORGkCmzlXSXEd.62Obd/E5SY4E6MYQSG"
                }
            ];
            return insertDataPromise("users", userList);
        })
        .then(function() {
            return getOneDocPromise('users', {username: 'mach'});
        })
        .then(function(user) {
            console.log("getUser: User found: " + JSON.stringify(user));
            machUserId = user._id;
            return Q();
        })
        .then(function() {
            return getOneDocPromise('users', {username: 'test'});
        })
        .then(function(user) {
            console.log("getUser: User found: " + JSON.stringify(user));
            testUserId = user._id;
            return Q();
        })
        // Customers
        .then(function () {
            return dropCollectionPromise("cust");
        })
        .then(function() {
            var customerList = [
                {
                    cid: 100,
                    uid: machUserId,
                    name: "Pelle",
                    addr1: "Storgatan 1",
                    addr2: "414 62 Göteborg",
                    phone: "0706-580222",
                    isValid: true
                },
                {
                    cid: 100,
                    uid: testUserId,
                    name: "TestPelle",
                    addr1: "TestStorgatan 1",
                    addr2: "414 62 Göteborg",
                    phone: "0706-580222",
                    isValid: true
                },
                {
                    cid: 101,
                    uid: machUserId,
                    name: "Pära",
                    isValid: false
                },
                {
                    cid: 101,
                    uid: testUserId,
                    name: "TestPära",
                    isValid: false
                },
                {
                    cid: 102,
                    uid: machUserId,
                    name: "Pär",
                    isValid: true
                }
            ];
            return insertDataPromise("cust", customerList);
        })
        // Invoices
        .then(function () {
            return dropCollectionPromise("invoice");
        })
        .fail(function() {
	    console.log("Drop collection invoice failed!");
	})
        .then(function() {
            var invoiceList = [
                {
                    iid: 1000,
                    uid: machUserId,
		    cid: 100,
                    customer_name: "Pelle",
                    customer_addr1: "Storgatan 1",
                    customer_addr2: "414 62 Göteborg",
                    date: "",
		    sum: "",
                    isValid: true
                },
                {
		    iid: 1000,
                    uid: testUserId,
                    cid: 100,
                    customer_name: "TestPelle",
                    customer_addr1: "TestStorgatan 1",
                    customer_addr2: "414 62 Göteborg",
                    date: "",
		    sum: "",
                    isValid: true
                },
                {
                    iid: 1001,
                    uid: machUserId,
                    cid: 101,
                    customer_name: "Pära",
                    isValid: false
                },
                {
                    iid: 1001,
                    uid: testUserId,
                    cid: 101,
                    customer_name: "TestPära",
                    isValid: false
                },
                {
                    iid: 1002,
                    uid: machUserId,
                    cid: 100,
                    customer_name: "Pär",
                    isValid: true
                }
            ];
            return insertDataPromise("invoice", invoiceList);
        })
        .done();
}

module.exports.getInvoices = function(uid) {
    var ouid = new ObjectID(uid)
    return getAllDocsPromise('invoice', {'isValid': true, 'uid': ouid});
}

module.exports.getCustomers = function(uid) {
    var ouid = new ObjectID(uid)
    return getAllDocsPromise('cust', {'isValid': true, 'uid': ouid});
}

module.exports.addInvoice = function(uid, invoice) {
    var deferred = Q.defer();
    getNextSequencePromise("iid").then(function(iid) {
        console.log("addInvoice: Allocated new iid=" + cid);
        //var customer = req.body;
        invoice.iid = iid;
        invoice.uid = new ObjectID(uid);
        insertDataPromise('invoice', invoice).then(function() {
            deferred.resolve(invoice);
        }).fail(function(err) {
            deferred.reject(err);
        });
    }).fail(function(err) {
        console.error("addInvoice: Error: " + err.body);
        deferred.reject(err);
    });

    return deferred.promise;
}

module.exports.updateInvoice = function(invoice) {
    invoice.uid = new ObjectID(invoice.uid);
    return updateDataPromise('invoice', invoice);
}

module.exports.addCustomer = function(uid, customer) {
    var deferred = Q.defer();
    getNextSequencePromise("cid").then(function(cid) {
        console.log("addCustomer: Allocated new cid=" + cid);
        //var customer = req.body;
        customer.cid = cid;
        customer.uid = new ObjectID(uid);
        insertDataPromise('cust', customer).then(function() {
            deferred.resolve(customer);
        }).fail(function(err) {
            deferred.reject(err);
        });
    }).fail(function(err) {
        console.error("addCustomer: Error: " + err.body);
        deferred.reject(err);
    });

    return deferred.promise;
}

module.exports.updateCustomer = function(customer) {
    customer.uid = new ObjectID(customer.uid);
    return updateDataPromise('cust', customer);
}

module.exports.getUser = function(username) {
    var deferred = Q.defer();
    getOneDocPromise('users', {username: username}).then(function(user) {
        if (user == undefined) {
            console.log("getUser: No user found");
            deferred.reject(new Error("The requested items could not be found."));
        } else {
            console.log("getUser: User found: " + user);
            deferred.resolve(user);
        }
    });
    return deferred.promise;
}

module.exports.addUser = function(user) {
    return insertDataPromise('users', user);
}

