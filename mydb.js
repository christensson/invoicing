'use strict';

var mongodb = require('mongodb');
var Q = require('q');
var util = require('./public/util.js');
var funct = require('./functions.js');
var ObjectID = mongodb.ObjectID;
var log = require('./log');

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
};

var mongo = require('./deployment.json').db;

var mongourl = generate_mongo_url(mongo);

var verbose = false;

module.exports.setVerbose = function() {
  verbose = true;
};

module.exports.setLocalDb = function() {
  var mongoLocal = {
      "hostname":"localhost",
      "port":27017,
      "username":"",
      "password":"",
      "name":"",
      "db":"mydb"};
  mongourl = generate_mongo_url(mongoLocal);
};

function dbop(opfunc) {
  mongodb.connect(mongourl, function(err, db){
    if (err) {
      log.error("mongodb connect error: " + err);
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

function countAllDocsPromise(collectionName, filter) {
  return dbopPromise().then(function(db) {
    var deferred = Q.defer();
    var coll = db.collection(collectionName);
    coll.count(filter, {}, function(err, count) {
      if (err) {
        deferred.reject(
            new Error("Error: countAllDocs(" + collectionName + "): " + err));
      } else {
        log.verbose("countAllDocs(" + collectionName +
              ", filter=" + JSON.stringify(filter) + "): count: " + count);
        deferred.resolve(count);
      }
    });
    return deferred.promise;
  });
}

function getAllDocsPromise(collectionName, filter, projection) {
  projection = typeof projection !== 'undefined' ? projection : {};
  return dbopPromise().then(function(db) {
    var deferred = Q.defer();
    var coll = db.collection(collectionName);
    coll.find(filter, projection).toArray(function(err, docs) {
      if (err) {
        deferred.reject(
            new Error("Error: getAllDocs(" + collectionName + "): " + err));
      } else {
        log.verbose("getAllDocs(" + collectionName +
            ", filter=" + JSON.stringify(filter) +
            ", projection=" + JSON.stringify(projection) +
            "): docs: " + JSON.stringify(docs));
        deferred.resolve(docs);
      }
    });
    return deferred.promise;
  });
}

module.exports.getAllDocsPromise = getAllDocsPromise;

function getAllDocsCursorPromise(collectionName, filter, projection) {
  projection = typeof projection !== 'undefined' ? projection : {};
  return dbopPromise().then(function(db) {
    var deferred = Q.defer();
    var coll = db.collection(collectionName);
    var cursor = coll.find(filter, projection);
    deferred.resolve(cursor);
    return deferred.promise;
  });
}

/**
 * opts.addLastAccessDate Adds date of last access to field lastAccessDate (default: false)
 * opts.incAccessCount Increments accessCount field (default: false)
 */
function getOneDocPromise(collectionName, filter, opts) {
  opts = typeof opts !== 'undefined' ? opts : {};
  // Set defaults
  if (!opts.hasOwnProperty('addLastAccessDate')) {
    opts.addLastAccessDate = false;
  }
  if (!opts.hasOwnProperty('incAccessCount')) {
    opts.incAccessCount = false;
  }

  return dbopPromise().then(function(db) {
    var deferred = Q.defer();
    var coll = db.collection(collectionName);
    var resultCb = function(isFindAndModify, err, doc) {
      if (err) {
        deferred.reject(
            new Error("Error: getOneDoc(" + collectionName + "): " + err));
      } else {
        var result = isFindAndModify?doc.value:doc;
        log.verbose("getOneDoc(" + collectionName + "): filter=" + JSON.stringify(filter) + ", doc: " + JSON.stringify(result));
        deferred.resolve(result);
      }
    };
    var updateSpecifier = undefined;
    if (opts.addLastAccessDate && opts.incAccessCount) {
      updateSpecifier = {
        $currentDate: {lastAccessDate: true},
        $inc: {accessCount: 1}
      }
    } else if (!opts.addLastAccessDate && opts.incAccessCount) {
      updateSpecifier = {
        $inc: {accessCount: 1}
      }
    } else if (opts.addLastAccessDate && !opts.incAccessCount) {
      updateSpecifier = {
        $currentDate: {lastAccessDate: true}
      }
    } else {
    }

    if (updateSpecifier === undefined) {
      log.debug("getOneDocPromise: findOne(query: " + JSON.stringify(filter) + ")");
      coll.findOne(filter, resultCb.bind(null, false));
    } else {
      log.debug("getOneDocPromise: findAndModify(query: " + JSON.stringify(filter) +
        ", update: " + JSON.stringify(updateSpecifier) + ")");
      coll.findAndModify(
        filter, // query
        [], // sort
        updateSpecifier, // update
        {}, // options
        resultCb.bind(null, true)
      );
    }
    return deferred.promise;
  });
}

module.exports.getOneDocPromise = getOneDocPromise;

function deleteAllDocsPromise(collectionName, filter) {
  return dbopPromise().then(function(db) {
    var deferred = Q.defer();
    var coll = db.collection(collectionName);
    coll.deleteMany(filter, function(err, result) {
      if (err) {
        deferred.reject(
            new Error("Error: deleteAllDocs(" + collectionName + "): " + err));
      } else {
        log.verbose("deleteAllDocs(" + collectionName +
            ", filter=" + JSON.stringify(filter) +
            "): result: " + JSON.stringify(result));
        deferred.resolve(result.deletedCount);
      }
    });
    return deferred.promise;
  });
}

module.exports.deleteAllDocsPromise = deleteAllDocsPromise;

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
            log.verbose("dropCollection(" + collectionName + "): success");
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

function createCollectionPromise(collectionName) {
  return dbopPromise().then(function (db) {
    var deferred = Q.defer();
    db.createCollection(collectionName, function(err, coll) {
      if (err) {
        deferred.reject(
            new Error("Error: createCollection(" + collectionName + "): " + err));
      } else {
        log.verbose("createCollection(" + collectionName + "): success");
        deferred.resolve(true);
      }
    });
    return deferred.promise;
  });
}

function createIndexPromise(collectionName, fieldOrSpec, opts) {
  return dbopPromise().then(function (db) {
    var deferred = Q.defer();
    db.createIndex(collectionName, fieldOrSpec, opts, function(err, coll) {
      if (err) {
        deferred.reject(
            new Error("Error: createIndex(" + collectionName + ", " + fieldOrSpec + "): " + err));
      } else {
        log.verbose("createIndex(" + collectionName + ", " + JSON.stringify(fieldOrSpec)  + "): success");
        deferred.resolve(true);
      }
    });
    return deferred.promise;
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
        log.verbose("insertData(" + collectionName + "): " + JSON.stringify(data, null, 4));
        coll.insert(data, {serializeFunctions: true}, function(err) {
          if(err) {
            deferred.reject(
                new Error("insertData(" + collectionName + "): " + err));
          } else {
            log.verbose("insertData(" + collectionName + "): success");
            deferred.resolve(true);
          }
        });
      }
    });
    return deferred.promise;
  });
}

function updateDataPromise(collectionName, data, incFields) {
  incFields = typeof incFields !== 'undefined' ? incFields : false;
  return dbopPromise().then(function (db) {
    var deferred = Q.defer();
    db.collection(collectionName, function(err, coll) {
      if (err) {
        deferred.reject(
            new Error("updateData(" + collectionName + "): " + err));
      } else {
        log.verbose("updateData(" + collectionName + "): _id=" + data._id + ", data=" + JSON.stringify(data, null, 4));
        // _id in db is really an ObjectId, but it got lost in all the JSON
        // mangling...
        data._id = new ObjectID(data._id);
        
        var updateData = undefined;
        if (incFields === false) {
          updateData = {
            $set: data
          };
        } else {
          updateData = {
            $set: data,
            $inc: incFields
          };
        }

        coll.update(
            {_id: data._id}, // query
            updateData, // update
            {}, // options
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

function getNextDocNrPerCompanyPromise(uid, companyId, nrField) {
  return dbopPromise().then(function (db) {
    var deferred = Q.defer();
    var coll = db.collection("company");
    var ouid = new ObjectID(uid);
    var ocompanyId = new ObjectID(companyId);
    var query = { _id: ocompanyId, uid: ouid };
    var fieldIncExpr = {};
    var incAmount = 1;
    fieldIncExpr[String(nrField)] = incAmount;
    coll.findAndModify(
        query,
        [], // sort
        { $inc: fieldIncExpr }, // update
        { 'new': false }, // options
        function(err, obj) {
          if(err) {
            deferred.reject(
                new Error("getNextDocNrPerCompanyPromise(" + JSON.stringify(query) +
                  ", nrField=" + nrField + "): " + err));
          } else {
            var value = obj.value[String(nrField)];
            if (value === undefined) {
              value = incAmount;
              log.warn("getNextDocNrPerCompanyPromise(" + JSON.stringify(query) +
                ", nrField=" + nrField + "): success: docNr=" + value + " set to init value since " + nrField + " missing.");
            }
            log.verbose("getNextDocNrPerCompanyPromise(" + JSON.stringify(query) +
                ", nrField=" + nrField + "): success: docNr=" + value);
            deferred.resolve(value);
          }
        }
    );
    return deferred.promise;
  });
}

function getNextCidPromise(uid, companyId) {
  return getNextDocNrPerCompanyPromise(uid, companyId, 'nextCid');
}

function getNextIidPromise(uid, companyId) {
  return getNextDocNrPerCompanyPromise(uid, companyId, 'nextIid');
}

function getNextOidPromise(uid, companyId) {
  return getNextDocNrPerCompanyPromise(uid, companyId, 'nextOid');
}

var colls = [
  "invite", "users", "company", "settings", "customer", "invoice", "offer", "itemGroupTempl", "article"
];

var indexes = [
  {
    collection: "company",
    specifier: {"isValid": 1, "uid": 1},
  },
  {
    collection: "customer",
    specifier: {"isValid": 1, "uid": 1},
  },
  {
    collection: "customer",
    specifier: {"isValid": 1, "uid": 1, "companyId": 1},
  },
  {
    collection: "invoice",
    specifier: {"isValid": 1, "uid": 1},
  },
  {
    collection: "invoice",
    specifier: {"isValid": 1, "uid": 1, "companyId": 1},
  },
  {
    collection: "offer",
    specifier: {"isValid": 1, "uid": 1},
  },
  {
    collection: "offer",
    specifier: {"isValid": 1, "uid": 1, "companyId": 1},
  },
  {
    collection: "itemGroupTempl",
    specifier: {"isValid": 1, "uid": 1},
  },
  {
    collection: "article",
    specifier: {"isValid": 1, "uid": 1},
  },
  {
    collection: "article",
    specifier: {"isValid": 1, "uid": 1, "companyId": 1},
  },
  {
    collection: "settings",
    specifier: {"uid": 1},
  },
  {
    collection: "users",
    specifier: {"username-local": 1},
  },
  {
    collection: "users",
    specifier: {"googleId": 1},
  },
  {
    collection: "invite",
    specifier: {"email": 1},
  },
];

var dropAllCollections = function() {
  var deferred = Q.defer();
  var jobs = [];
  for (var i = 0; i < colls.length; i++) {
    var collection = colls[i];
    jobs.push(dropCollectionPromise(collection));
  }
  Q.allSettled(jobs)
  .then(function (results) {
    results.forEach(function (result) {
        if (result.state === "fulfilled") {
            var value = result.value;
        } else {
            var reason = result.reason;
            log.warn("Collection not dropped, error ignored: " + result.reason);
        }
        deferred.resolve();
    });
  });
  return deferred.promise;
};

var createAllCollections = function() {
  var jobs = [];
  for (var i = 0; i < colls.length; i++) {
    var collection = colls[i];
    jobs.push(createCollectionPromise(collection));
  }
  return Q.all(jobs);
};

var createAllIndexes = function() {
  var jobs = [];
  for (var i = 0; i < indexes.length; i++) {
    var collection = indexes[i].collection;
    var specifier = indexes[i].specifier;
    jobs.push(createIndexPromise(collection, specifier));
  }
  return Q.all(jobs);
};

var initCollectionsRelease = function(inviteList) {
  return insertDataPromise("invite", inviteList);
};

var initCollectionsDevel = function(inviteList) {
  var deferred = Q.defer();

  var machUserId = undefined;
  var testUserId = undefined;
  var machCompany1 = undefined;
  var testCompany1 = undefined;
  var testCompany2 = undefined;
  var machCompany1Cid = 100;
  var testCompany1Cid = 100;
  var testCompany2Cid = 100;
  var machCompany1Iid = 100;
  var testCompany1Iid = 100;
  var machCompanyCid100 = undefined;
  var testCompanyCid100 = undefined;
  var testCompanyCid101 = undefined;

  // Invitation list
  insertDataPromise("invite", inviteList)
  .then(function() {
    var userList = [
                    {
                      "username-local": "mach",
                      // password is "mach"
                      "password": "$2a$08$3IwByU08C2BdgvwuvMec.eD3ugRp7oRpPHpuRwAOY1q0D8YUiSIYa",
                      "info": funct.createUserInfo("Marcus", "marcus@domain.se"),
                    },
                    {
                      "username-local": "test",
                      // password is "test"
                      "password": "$2a$08$8XE3C/OGbaT6v2PvonVqTORGkCmzlXSXEd.62Obd/E5SY4E6MYQSG",
                      "info": funct.createUserInfo("Test", "test@someotherdomain.net"),
                    }
                    ];
    return insertDataPromise("users", userList);
  })
  .then(function() {
    return getOneDocPromise('users', {"username-local": 'mach'});
  })
  .then(function(user) {
    log.info("getUser: User found: " + JSON.stringify(user));
    machUserId = ObjectID(user._id);
    return Q();
  })
  .then(function() {
    return getOneDocPromise('users', {"username-local": 'test'});
  })
  .then(function(user) {
    log.info("getUser: User found: " + JSON.stringify(user));
    testUserId = ObjectID(user._id);
    return Q();
  })
  // Companies
  .then(function() {
    var companyList = [
                       {
                         uid: machUserId,
                         name: "Machapär",
                         addr1: "Gatan 1",
                         addr2: "414 62 Göteborg",
                         phone: "031-123132",
                         isValid: true,
                         nextCid: 1000,
                         nextIid: 2000,
                         nextOid: 3000,
                       },
                       {
                         uid: testUserId,
                         name: "Test company widht a long name 1",
                         addr1: "Nygatan 1",
                         addr2: "414 62 Göteborg",
                         contact1Caption: "Telefon",
                         contact1: "031-123133",
                         contact2Caption: "Mobil",
                         contact2: "0730-650238",
                         contact3Caption: "E-post",
                         contact3: "test.company@somedomain.se",
                         payment1Caption: "Bankgiro",
                         payment1: "1234-5879",
                         payment2Caption: "Swish",
                         payment2: "345659879",
                         payment3Caption: "IBAN",
                         payment3: "SE3550000000054910000003",
                         paymentFocus: "3",
                         paymentCustomText: "Dröjsmålsränta 25%",
                         vatNr: "SE501212456701",
                         vatNrCustomText: "Innehar F-skattebevis",
                         reverseChargeText: "Moms på byggtjänster har inte debiterats enligt Mervärdesskattelagen 1 kap 2§.\nKöparens momsregistreringsnr: %c.vatNr%",
                         "logo" : { "mimetype" : "image/png", "path" : "uploads/pepsi-logo.png", "originalname" : "pepsi-logo.png" },
                         isValid: true,
                         nextCid: 3000,
                         nextIid: 4000,
                         nextOid: 5000,
                       },
                       {
                         uid: testUserId,
                         name: "Test company 2",
                         addr1: "Husargatan 1",
                         addr2: "414 62 Göteborg",
                         phone: "031-123132",
                         isValid: true,
                         nextCid: 5000,
                         nextIid: 6000,
                         nextOid: 7000,
                       },
                       ];
    return insertDataPromise("company", companyList);
  })
  .then(function() {
    return getOneDocPromise('company', {name: 'Machapär'});
  })
  .then(function(c) {
    log.info("getCompany: Found: " + JSON.stringify(c));
    machCompany1 = c;
    return Q();
  })
  .then(function() {
    return getOneDocPromise('company', {name: 'Test company widht a long name 1'});
  })
  .then(function(c) {
    log.info("getCompany: Found: " + JSON.stringify(c));
    testCompany1 = c;
    return Q();
  })
  .then(function() {
    return getOneDocPromise('company', {name: 'Test company 2'});
  })
  .then(function(c) {
    log.info("getCompany: Found: " + JSON.stringify(c));
    testCompany2 = c;
    return Q();
  })
  // Init user contexts
  .then(function() {
    var userQuery = {'username-local': 'test'};
    return initUserContext(userQuery, 'unlimited');
  })
  .then(function() {
    var userQuery = {'username-local': 'mach'};
    return initUserContext(userQuery, 'demo');
  })
  // Customers
  .then(function() {
    var customerList = [
                        {
                          cid: machCompany1Cid++,
                          uid: machUserId,
                          companyId: ObjectID(machCompany1._id),
                          name: "Pelle",
                          addr1: "Storgatan 1",
                          addr2: "414 62 Göteborg",
                          phone1: "0706-580222",
                          isValid: true
                        },
                        {
                          cid: testCompany1Cid++,
                          uid: testUserId,
                          companyId: ObjectID(testCompany1._id),
                          name: "TestPelle",
                          addr1: "TestStorgatan 1",
                          addr2: "414 62 Göteborg",
                          phone1: "0706-580222",
                          defaultNumDaysUntilPayment: 25,
                          useReverseCharge: false,
                          isValid: true
                        },
                        {
                          cid: machCompany1Cid++,
                          uid: machUserId,
                          companyId: ObjectID(machCompany1._id),
                          name: "Pära",
                          isValid: false
                        },
                        {
                          cid: testCompany1Cid++,
                          uid: testUserId,
                          companyId: ObjectID(testCompany1._id),
                          name: "Svenska Kullagerfabriken Aktiebolag",
                          addr1: "TestNygata 2",
                          addr2: "414 62 Göteborg",
                          addr3: "Referens Thomas Andersson",
                          phone1: "0706-580223",
                          vatNr: "SE401212567801",
                          defaultNumDaysUntilPayment: 30,
                          useReverseCharge: true,
                          isValid: true
                        },
                        {
                          cid: testCompany2Cid++,
                          uid: testUserId,
                          companyId: ObjectID(testCompany2._id),
                          name: "TestPära2",
                          addr1: "2 TestNygata 2",
                          addr2: "2 414 62 Göteborg",
                          phone1: "2 0706-580223",
                          defaultNumDaysUntilPayment: 30,
                          isValid: true
                        },
                        {
                          cid: machCompany1Cid++,
                          uid: machUserId,
                          companyId: ObjectID(machCompany1._id),
                          name: "Pär",
                          isValid: true
                        }
                        ];
    return insertDataPromise('customer', customerList);
  })
  .then(function() {
    return getOneDocPromise('customer', {cid: 100, uid: machUserId});
  })
  .then(function(c) {
    machCompanyCid100 = c;
    return Q();
  })
  .then(function() {
    return getOneDocPromise('customer', {cid: 100, uid: testUserId});
  })
  .then(function(c) {
    testCompanyCid100 = c;
    return Q();
  })
  .then(function() {
    return getOneDocPromise('customer', {cid: 101, uid: testUserId});
  })
  .then(function(c) {
    testCompanyCid101 = c;
    return Q();
  })
  // Invoices
  .then(function() {
    var invoiceList = [
                       {
                         docNr: machCompany1Iid++,
                         docType: 'invoice',
                         uid: machUserId,
                         companyId: ObjectID(machCompany1._id),
                         company: machCompany1,
                         isLocked: false,
                         isValid: true,
                         isPaid: true,
                         date: new Date("2015-10-10").toISOString().split("T")[0],
                         daysUntilPayment: 20,
                         lastPaymentDate: util.dateAddDays(new Date("2015-10-10"), 20).toISOString().split("T")[0],
                         customer: machCompanyCid100,
                         currency: "SEK",
                         invoiceItems: [],
                         totalExclVat: 0,
                         totalInclVat: 0
                       },
                       {
                         docNr: testCompany1Iid++,
                         docType: 'invoice',
                         uid: testUserId,
                         companyId: ObjectID(testCompany1._id),
                         company: testCompany1,
                         isLocked: false,
                         isValid: true,
                         isPaid: false,
                         date: new Date("2015-10-10").toISOString().split("T")[0],
                         daysUntilPayment: 10,
                         lastPaymentDate: util.dateAddDays(new Date("2015-10-10"), 10).toISOString().split("T")[0],
                         customer: testCompanyCid100,
                         currency: "SEK",
                         invoiceItems: [],
                         totalExclVat: 0,
                         totalInclVat: 0
                       },
                       {
                         docNr: testCompany1Iid++,
                         docType: 'invoice',
                         uid: testUserId,
                         companyId: ObjectID(testCompany1._id),
                         company: testCompany1,
                         isLocked: false,
                         isValid: true,
                         isPaid: false,
                         isCanceled: true,
                         date: new Date("2015-10-10").toISOString().split("T")[0],
                         daysUntilPayment: 30,
                         lastPaymentDate: util.dateAddDays(new Date("2015-10-10"), 30).toISOString().split("T")[0],
                         yourRef: "Thomas Andersson",
                         ourRef: "Marcus Christensson",
                         projId: "1321321231",
                         customer: testCompanyCid101,
                         currency: "SEK",
                         invoiceItems: [
                                        {
                                          description: "En väldigt lång rad som kan beskriva något extremt väl. Den kan fortsätta långt långt långt och innehålla många många tecken.",
                                          price: 11002,
                                          count: 1,
                                          discount: 0,
                                          vat: 25,
                                          total: 11002,
                                          isValid: true
                                        },
                                        {
                                          description: "Honungsburk 100g",
                                          price: 1010.0,
                                          count: 5,
                                          discount: 10,
                                          vat: 12.5,
                                          total: 4545.0,
                                          isValid: true
                                        },
                                        ],
                                        totalExclVat: 15547.25,
                                        totalInclVat: 18865.625
                       },
                       {
                         docNr: testCompany1Iid++,
                         docType: 'invoice',
                         uid: testUserId,
                         companyId: ObjectID(testCompany1._id),
                         company: testCompany1,
                         isLocked: false,
                         isValid: true,
                         isPaid: false,
                         date: new Date("2015-10-10").toISOString().split("T")[0],
                         daysUntilPayment: 10,
                         lastPaymentDate: util.dateAddDays(new Date("2015-10-10"), 10).toISOString().split("T")[0],
                         customer: testCompanyCid101,
                         currency: "EUR",
                         invoiceItems: [
                                        {
                                          description: "Första",
                                          price: 10.0,
                                          count: 10,
                                          discount: 0.0,
                                          vat: 0.25,
                                          total: 100.0,
                                          isValid: true
                                        },
                                        {
                                          description: "Andra",
                                          price: 100.0,
                                          count: 5,
                                          discount: 0.0,
                                          vat: 0.25,
                                          total: 500.0,
                                          isValid: true
                                        },
                                        ],
                                        totalExclVat: 600.0,
                                        totalInclVat: 750.5
                       }
                       ];
    return insertDataPromise("invoice", invoiceList);
  })
  .done(function() {
    deferred.resolve();
  });
  
  return deferred.promise;
};

module.exports.init = function(devMode, doneCb) {
  log.info("Init DB: devMode=" + devMode + " using mongourl: " + mongourl);

  var inviteList = [
                    {
                      "email": "marcus.christensson@gmail.com",
                      "license": "unlimited",
                      "isAdmin": true
                    },
                    {
                      "email": "christian.askland@gmail.com",
                      "license": "unlimited",
                      "isAdmin": false
                    },
                    {
                      "email": "martinsson.sorgarden@gmail.com",
                      "license": "unlimited",
                      "isAdmin": false
                    },
                    {
                      "email": "david@osir.se",
                      "license": "unlimited",
                      "isAdmin": false
                    },
                    {
                      "email": "davba@hotmail.com",
                      "license": "unlimited",
                      "isAdmin": false
                    }
                    ];

  var initDb = initCollectionsRelease;
  if (devMode) {
    initDb = initCollectionsDevel;
  }
  
  // Drop collections
  dropAllCollections().then(function() {
    return createAllCollections();
  })
  .fail(function(err) {
    log.warn("Failed to create collections: " + err);
  }).then(function() {
    return createAllIndexes();
  })
  .fail(function(err) {
    log.warn("Failed to create indexes: " + err);
  })
  .then(function() {
    return initDb(inviteList);
  })
  .done(doneCb);
};

module.exports.getStats = function(uid, companyId) {
  companyId = typeof companyId !== 'undefined' ? companyId : "undefined";
  var ouid = new ObjectID(uid);
  var deferred = Q.defer();
  
  var res = {
      "total": {
        "numCompanies": 0,
        "numCustomers": 0,
        "numInvoices": 0,
        "numOffers": 0,
        "numItemGroupTemplates": 0,
      },
      "activeCompany": {
        "isSet": false,
        "numCustomers": 0,
        "numInvoices": 0,
        "numOffers": 0,
      }
  };
  
  var jobs = [
    countAllDocsPromise('company', {'isValid': true, 'uid': ouid}),
    countAllDocsPromise('customer', {'isValid': true, 'uid': ouid}),
    countAllDocsPromise('invoice', {'isValid': true, 'uid': ouid}),
    countAllDocsPromise('offer', {'isValid': true, 'uid': ouid}),
    countAllDocsPromise('itemGroupTempl', {'isValid': true, 'uid': ouid}),
  ];
  
  if (companyId !== "undefined" && companyId !== "null") {
    log.verbose("getStats: Active company is " + companyId);
    var ocompanyId = new ObjectID(companyId);
    jobs.push(countAllDocsPromise('customer', {'isValid': true, 'uid': ouid, 'companyId': ocompanyId}));
    jobs.push(countAllDocsPromise('invoice', {'isValid': true, 'uid': ouid, 'companyId': ocompanyId}));
    jobs.push(countAllDocsPromise('offer', {'isValid': true, 'uid': ouid, 'companyId': ocompanyId}));
  }
  
  Q.all(jobs).then(function(results) {
    var i = 0;
    res.total.numCompanies = results[i++];
    res.total.numCustomers = results[i++];
    res.total.numInvoices = results[i++];
    res.total.numOffers = results[i++];
    res.total.numItemGroupTemplates = results[i++];
    
    if (results.length > i) {
      res.activeCompany.numCustomers = results[i++];
      res.activeCompany.numInvoices = results[i++];
      res.activeCompany.numOffers = results[i++];
    }
    deferred.resolve(res);
  })
  .fail(function(err) {
    deferred.reject(err);
  });

  return deferred.promise;
};

module.exports.getSettings = function(uid) {
  var ouid = new ObjectID(uid);
  return getOneDocPromise('settings', {'uid': ouid});
};

module.exports.updateSettings = function(uid, settings) {
  settings.uid = new ObjectID(uid);
  settings.activeCompanyId = new ObjectID(settings.activeCompanyId);
  var increment = {updateCount: 1};
  return updateDataPromise('settings', settings, increment);
};

module.exports.updateUser = function(uid, user) {
  user._id = new ObjectID(uid);
  var increment = {updateCount: 1};
  return updateDataPromise('users', user, increment);
};

/** Get invoices or offers
 * @param docType 'invoice' or 'offer'
 * @param opts.batchSize (Default: 100)
 * @param opts.limit (Default: none)
 * @param opts.compact (Default: false)
 */
module.exports.getInvoicesOrOffers = function(docType, uid, companyId, opts) {
  opts = typeof opts !== 'undefined' ? opts : {};
  var collection = undefined;
  if (docType == 'invoice' || docType == 'offer') {
    collection = docType;
  } else {
    deferred.reject(new Error("getInvoicesOrOffers: unsupported docType=" + docType));
    return deferred.promise;
  }
  // Set default parameters
  if (!opts.batchSize) {
    opts.batchSize = 100;
  }
  if (!opts.compact) {
    opts.compact = false;
  }
  var ouid = new ObjectID(uid);
  var ocompanyId = new ObjectID(companyId);
  var deferred = Q.defer();
  var projection = undefined;
  if (opts.compact) {
    projection = {'invoiceItemGroups': 0};
  }
  getAllDocsCursorPromise(collection, {'isValid': true, 'uid': ouid, 'companyId': ocompanyId}, projection)
    .then(function(cursor) {
      cursor.batchSize(opts.batchSize);
      if (opts.limit) {
        cursor.limit(opts.limit);
      }
      var stream = cursor.stream();
      deferred.resolve(stream);
    });
  return deferred.promise;
};

module.exports.getInvoiceOrOffer = function(docType, uid, id) {
  var ouid = new ObjectID(uid);
  var oid = new ObjectID(id);
  var deferred = Q.defer();
  var collection = undefined;
  if (docType == 'invoice' || docType == 'offer') {
    collection = docType;
  } else {
    deferred.reject(new Error("getInvoiceOrOffer: unsupported docType=" + docType));
    return deferred.promise;
  }
  getOneDocPromise(collection, {'_id': oid, 'uid': ouid}).then(function(doc) {
    if (doc == undefined) {
      log.warn("getInvoiceOrOffer: No doc type=" + docType + " with id=" + id + " found");
      deferred.reject(new Error("The requested document id=" + id + " could not be found."));
    } else {
      log.verbose("getInvoice: Doc found docType=" + docType + ": " + JSON.stringify(doc));
      deferred.resolve(doc);
    }
  });
  return deferred.promise;
};

module.exports.getCustomers = function(uid, companyId) {
  var ouid = new ObjectID(uid);
  var ocompanyId = new ObjectID(companyId);
  return getAllDocsPromise('customer', {'isValid': true, 'uid': ouid, 'companyId': ocompanyId});
};

module.exports.getCustomer = function(uid, id) {
  var ouid = new ObjectID(uid);
  var oid = new ObjectID(id);
  return getOneDocPromise('customer', {'_id': oid, 'isValid': true, 'uid': ouid});
};

module.exports.getCompanies = function(uid) {
  var ouid = new ObjectID(uid);
  return getAllDocsPromise('company', {'isValid': true, 'uid': ouid});
};

module.exports.getCompany = function(uid, companyId) {
  var ouid = new ObjectID(uid);
  var ocompanyId = new ObjectID(companyId);
  return getOneDocPromise('company', {'_id': ocompanyId, 'isValid': true, 'uid': ouid});
};

module.exports.getItemGroupTemplates = function(uid) {
  var ouid = new ObjectID(uid);
  return getAllDocsPromise('itemGroupTempl', {'isValid': true, 'uid': ouid});
};

module.exports.getArticles = function(uid, companyId) {
  var ouid = new ObjectID(uid);
  var ocompanyId = new ObjectID(companyId);
  return getAllDocsPromise('article', {'isValid': true, 'uid': ouid, 'companyId': ocompanyId});
};

module.exports.addInvoiceOrOffer = function(docType, uid, companyId, doc) {
  var deferred = Q.defer();
  var ouid = new ObjectID(uid);
  var ocompanyId = new ObjectID(companyId);
  var collection = undefined;
  if (docType == 'invoice' || docType == 'offer') {
    collection = docType;
  } else {
    deferred.reject(new Error("addInvoiceOrOffer: unsupported docType=" + docType));
    return deferred.promise;
  }

  var getNextIdJob = undefined;
  if (docType == 'invoice') {
    getNextIdJob = getNextIidPromise(uid, companyId);
  } else if (docType == 'offer') {
    getNextIdJob = getNextOidPromise(uid, companyId);
  }
  getNextIdJob.then(function(docId) {
    log.verbose("addInvoiceOrOffer: Allocated new id=" + docId + " for docType=" + docType);
    if (docType == 'invoice') {
      doc.docNr = docId;
    } else if (docType == 'offer') {
      doc.docNr = docId;
    }
    doc.uid = ouid;
    doc.companyId = ocompanyId;
    doc.company._id = ocompanyId;
    doc.updateCount = 0;
    insertDataPromise(collection, doc).then(function() {
      deferred.resolve(doc);
    }).fail(function(err) {
      deferred.reject(err);
    });
  }).fail(function(err) {
    log.error("addInvoiceOrOffer: Error: " + err.body);
    deferred.reject(err);
  });

  return deferred.promise;
};

module.exports.addInvoiceRaw = function(invoice) {
  return insertDataPromise('invoice', invoice);
};

module.exports.addOfferRaw = function(offer) {
  return insertDataPromise('offer', offer);
};

module.exports.updateInvoiceOrOffer = function(docType, doc) {
  var deferred = Q.defer();
  var collection = undefined;
  if (docType == 'invoice' || docType == 'offer') {
    collection = docType;
  } else {
    deferred.reject(new Error("updateInvoiceOrOffer: unsupported docType=" + docType));
    return deferred.promise;
  }
  doc.uid = new ObjectID(doc.uid);
  doc.companyId = new ObjectID(doc.companyId);
  doc.company._id = new ObjectID(doc.company._id);
  var increment = {updateCount: 1};
  updateDataPromise(collection, doc, increment).then(function(data) {
    deferred.resolve(data);
  }).fail(function(err) {
    log.error("updateInvoiceOrOffer: Error: " + err.body);
    deferred.reject(err);
  });
  return deferred.promise;
};

module.exports.addCustomer = function(uid, companyId, customer) {
  var deferred = Q.defer();
  getNextCidPromise(uid, companyId).then(function(cid) {
    log.verbose("addCustomer: Allocated new cid=" + cid);
    customer.cid = cid;
    customer.uid = new ObjectID(uid);
    customer.companyId = new ObjectID(companyId);
    customer.updateCount = 0;
    insertDataPromise('customer', customer).then(function() {
      deferred.resolve(customer);
    }).fail(function(err) {
      deferred.reject(err);
    });
  }).fail(function(err) {
    log.error("addCustomer: Error: " + err.body);
    deferred.reject(err);;
  });

  return deferred.promise;
};

module.exports.addCustomerRaw = function(customer) {
  return insertDataPromise('customer', customer);
};

module.exports.updateCustomer = function(customer) {
  customer.uid = new ObjectID(customer.uid);
  customer.companyId = new ObjectID(customer.companyId);
  var increment = {updateCount: 1};
  return updateDataPromise('customer', customer, increment);
};

module.exports.addCompany = function(uid, company) {
  var deferred = Q.defer();
  company.uid = new ObjectID(uid);
  company.updateCount = 0;
  insertDataPromise('company', company).then(function() {
    deferred.resolve(company);
  }).fail(function(err) {
    deferred.reject(err);
  });
  return deferred.promise;
};

module.exports.updateCompany = function(company) {
  company.uid = new ObjectID(company.uid);
  var increment = {updateCount: 1};
  return updateDataPromise('company', company, increment);
};

module.exports.addItemGroupTemplate = function(uid, groupTempl) {
  var deferred = Q.defer();
  groupTempl.uid = new ObjectID(uid);
  groupTempl.updateCount = 0;
  insertDataPromise('itemGroupTempl', groupTempl).then(function() {
    deferred.resolve(groupTempl);
  }).fail(function(err) {
    deferred.reject(err);
  });
  return deferred.promise;
};

module.exports.addItemGroupTemplateRaw = function(groupTempl) {
  return insertDataPromise('itemGroupTempl', groupTempl);
};

module.exports.updateItemGroupTemplate = function(groupTempl) {
  groupTempl.uid = new ObjectID(groupTempl.uid);
  var increment = {updateCount: 1};
  return updateDataPromise('itemGroupTempl', groupTempl, increment);
};

module.exports.addArticle = function(uid, companyId, article) {
  var deferred = Q.defer();
  article.uid = new ObjectID(uid);
  article.companyId = new ObjectID(companyId);
  article.updateCount = 0;
  insertDataPromise('article', article).then(function() {
    deferred.resolve(article);
  }).fail(function(err) {
    deferred.reject(err);
  });
  return deferred.promise;
};

module.exports.addArticleRaw = function(article) {
  return insertDataPromise('article', article);
};

module.exports.updateArticle = function(article) {
  article.uid = new ObjectID(article.uid);
  article.companyId = new ObjectID(article.companyId);
  var increment = {updateCount: 1};
  return updateDataPromise('article', article, increment);
};

module.exports.getUsers = function() {
  // Projection excludes password...
  var deferred = Q.defer();
  Q.all([getAllDocsPromise('users', {}, {"password": 0}),
         getAllDocsPromise('settings', {})
         ])
  .then(function(results) {
    // Perform join
    var users = results[0];
    var settings = results[1];
    var usersAndSettings = [];
    users.forEach(function(u) {
      var data = u;
      var ouid = new ObjectID(u._id);
      for (var i = 0; i < settings.length; i++) {
        if (ouid.equals(new ObjectID(settings[i].uid))) {
          data.settings = settings[i];
          break;
        }
      }
      usersAndSettings.push(data);
    });
    deferred.resolve(usersAndSettings);
  })
  .fail(function(err) {
    deferred.reject(err);
  });
  return deferred.promise;
};

module.exports.getInvites = function() {
  return getAllDocsPromise('invite', {});
};

/**
 * opts.includePassword Include the password fields in the returned data (default: false)
 * opts.markAccess Increments accessCount and sets lastAccessDate fields (default: false)
 */
 module.exports.getUser = function(query, opts) {
  opts = typeof opts !== 'undefined' ? opts : {};
  // Set defaults
  if (!opts.hasOwnProperty('includePassword')) {
    opts.includePassword = false;
  }
  if (!opts.hasOwnProperty('markAccess')) {
    opts.markAccess = false;
  }
  var deferred = Q.defer();
  var getOpts = {};
  if (opts.markAccess) {
    getOpts.addLastAccessDate = true;
    getOpts.incAccessCount = true;
  }
  getOneDocPromise('users', query, getOpts).then(function(user) {
    if (!user) {
      log.warn("getUser: No user found! query=" + JSON.stringify(query));
      deferred.reject(new Error("The requested items could not be found."));
    } else {
      if (!opts.includePassword) {
        delete user.password; // Do not expose password unless explicitly wanted!
      }
      log.verbose("getUser: User found: " + JSON.stringify(user));
      deferred.resolve(user);
    }
  });
  return deferred.promise;
};

module.exports.addUser = function(user) {
  user.updateCount = 0;
  return insertDataPromise('users', user);
};

module.exports.isEmailInvited = function(email) {
  var deferred = Q.defer();
  getOneDocPromise('invite', {email: email}).then(function(doc) {
    if (!doc) {
      log.info("isEmailInvited: email=" + email + " hasn't been invited!");
      deferred.reject(new Error("User with email " + email + " hasn't been invited!"));
    } else {
      log.verbose("isEmailInvited: email=" + email + " has been invited. info=" + JSON.stringify(doc));
      deferred.resolve(doc);
    }
  });
  return deferred.promise;
};

var initUserItemGroupTemplates = function(uid) {
  var initialList = [
    {
      uid: uid,
      name: "Detaljer",
      title: "Detaljer",
      isValid: true,
      isQuickButton: true,
      isTextOnlyDefault: false,
      hasTitleExtraField: false,
      titleExtraField: "",
      descColLbl: "Beskrivning",
      priceColLbl: "Á-pris",
      countColLbl: "Antal",
      discountColLbl: "Rabatt",
      vatColLbl: "Moms",
      totalColLbl: "Belopp",
      hasDesc: true,
      hasPrice: true,
      hasCount: true,
      hasDiscount: false,
      negateDiscount: false,
      hasVat: true,
      hasTotal: true,
      updateCount: 0
    },
    {
      uid: uid,
      name: "Detaljer (med rabatt)",
      title: "Detaljer",
      isValid: true,
      isQuickButton: false,
      isTextOnlyDefault: false,
      hasTitleExtraField: false,
      titleExtraField: "",
      descColLbl: "Beskrivning",
      priceColLbl: "Á-pris",
      countColLbl: "Antal",
      discountColLbl: "Rabatt",
      vatColLbl: "Moms",
      totalColLbl: "Belopp",
      hasDesc: true,
      hasPrice: true,
      hasCount: true,
      hasDiscount: true,
      negateDiscount: false,
      hasVat: true,
      hasTotal: true,
      updateCount: 0
    },
    {
      uid: uid,
      name: "Arbetstimmar",
      title: "Arbetstimmar",
      isValid: true,
      isQuickButton: true,
      isTextOnlyDefault: false,
      hasTitleExtraField: false,
      titleExtraField: "",
      descColLbl: "Beskrivning",
      priceColLbl: "Kr/timme",
      countColLbl: "Timmar",
      discountColLbl: "Rabatt",
      vatColLbl: "Moms",
      totalColLbl: "Belopp",
      hasDesc: true,
      hasPrice: true,
      hasCount: true,
      hasDiscount: false,
      negateDiscount: false,
      hasVat: true,
      hasTotal: true,
      updateCount: 0
    },
    {
      uid: uid,
      name: "Resor",
      title: "Resor",
      isValid: true,
      isQuickButton: true,
      isTextOnlyDefault: false,
      hasTitleExtraField: false,
      titleExtraField: "",
      descColLbl: "Beskrivning",
      priceColLbl: "Kr/mil",
      countColLbl: "Mil",
      discountColLbl: "Rabatt",
      vatColLbl: "Moms",
      totalColLbl: "Belopp",
      hasDesc: true,
      hasPrice: true,
      hasCount: true,
      hasDiscount: false,
      negateDiscount: false,
      hasVat: true,
      hasTotal: true,
      updateCount: 0
    },
    {
      uid: uid,
      name: "Material (med pålägg)",
      title: "Material",
      isValid: true,
      isQuickButton: false,
      isTextOnlyDefault: false,
      hasTitleExtraField: false,
      titleExtraField: "",
      descColLbl: "Beskrivning",
      priceColLbl: "Belopp",
      countColLbl: "Antal",
      discountColLbl: "Pålägg",
      vatColLbl: "Moms",
      totalColLbl: "Belopp",
      hasDesc: true,
      hasPrice: true,
      hasCount: false,
      hasDiscount: true,
      negateDiscount: true,
      hasVat: true,
      hasTotal: true,
      updateCount: 0
    },
    {
      uid: uid,
      name: "Textruta",
      title: "",
      isValid: true,
      isQuickButton: false,
      isTextOnlyDefault: true,
      hasTitleExtraField: false,
      titleExtraField: "",
      descColLbl: "",
      priceColLbl: "Belopp",
      countColLbl: "Antal",
      discountColLbl: "Pålägg",
      vatColLbl: "Moms",
      totalColLbl: "Belopp",
      hasDesc: true,
      hasPrice: false,
      hasCount: false,
      hasDiscount: false,
      negateDiscount: false,
      hasVat: false,
      hasTotal: false,
      updateCount: 0
    }
  ];
  return insertDataPromise('itemGroupTempl', initialList);
};

/** Inits all collections for user.
 * - settings
 * - itemGroupTemplates
 * @param userQuery query for 
 * @return promise of user
 */
var initUserContext = function(userQuery, license, opts) {
  license = typeof license !== 'undefined' ? license : "demo";
  opts = typeof opts !== 'undefined' ? opts : {
    initSettings: true,
    initTemplates: true
  };
  var deferred = Q.defer();
  log.verbose("initUserContext: query=" + JSON.stringify(userQuery));
  var user = undefined;
  module.exports.getUser(userQuery).then(function (result) {
    user = result;
    log.verbose("initUserContext: Found user=" + JSON.stringify(user));
    return Q();
  }).then(function() {
    var defaultSettings = {
        "uid": user._id,
        "activeCompanyId": undefined,
        "license": license,
        "updateCount": 0
    };
    if (opts.initSettings) {
      log.verbose("initUserContext: Set default settings: " + JSON.stringify(defaultSettings));
      return insertDataPromise("settings", defaultSettings);
    } else {
      log.verbose("initUserContext: Skipped default settings!");
      return Q();
    }
  }).then(function() {
    if (opts.initTemplates) {
      log.verbose("initUserContext: Set default group templates, uid=" + user._id);
      return initUserItemGroupTemplates(user._id);
    } else {
      log.verbose("initUserContext: Skipped default group templates!");
      return Q();
    }
  }).then(function() {
    deferred.resolve(user);
  }).fail(function(err) {
    deferred.reject(err);
  });
  
  return deferred.promise;
};

module.exports.initUserContext = initUserContext;

module.exports.toObjectId = function(value) {
  return new ObjectID(value);
};