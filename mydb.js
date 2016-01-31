var mongodb = require('mongodb');
var Q = require('q');
var util = require('./public/util.js');
var funct = require('./functions.js');
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
};

var mongo = require('./deployment.json').db;

var mongourl = generate_mongo_url(mongo);

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

function countAllDocsPromise(collectionName, filter) {
  return dbopPromise().then(function(db) {
    var deferred = Q.defer();
    var custColl = db.collection(collectionName);
    custColl.count(filter, {}, function(err, count) {
      if (err) {
        deferred.reject(
            new Error("Error: countAllDocs(" + collectionName + "): " + err));
      } else {
        console.log("countAllDocs(" + collectionName +
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
    var custColl = db.collection(collectionName);
    custColl.find(filter, projection).toArray(function(err, docs) {
      if (err) {
        deferred.reject(
            new Error("Error: getAllDocs(" + collectionName + "): " + err));
      } else {
        console.log("getAllDocs(" + collectionName +
            ", filter=" + JSON.stringify(filter) +
            ", projection=" + JSON.stringify(projection) +
            "): docs: " + JSON.stringify(docs));
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
        console.log("getOneDoc(" + collectionName + "): filter=" + JSON.stringify(filter) + ", doc: " + JSON.stringify(doc));
        deferred.resolve(doc);
      }
    });
    return deferred.promise;
  });
}

module.exports.getOneDocPromise = getOneDocPromise;

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

function updateDataPromise(collectionName, data, replace) {
  return dbopPromise().then(function (db) {
    var deferred = Q.defer();
    db.collection(collectionName, function(err, coll) {
      if (err) {
        deferred.reject(
            new Error("updateData(" + collectionName + "): " + err));
      } else {
        console.log("updateData(" + collectionName + "): _id=" + data._id + ", data=" + JSON.stringify(data, null, 4));
        // _id in db is really an ObjectId, but it got lost in all the JSON
        // mangling...
        data._id = new ObjectID(data._id);
        
        var updateData = data;        
        if (!replace) {
          updateData = {
              $set: data
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

function getNextCidPromise(uid, companyId) {
  return dbopPromise().then(function (db) {
    var deferred = Q.defer();
    var coll = db.collection("company");
    var ouid = new ObjectID(uid);
    var ocompanyId = new ObjectID(companyId);
    var query = { uid: ouid, _id: ocompanyId };
    coll.findAndModify(
        query,
        [], // sort
        { $inc: { nextCid: 1 } }, // update
        { 'new': false }, // options
        function(err, obj) {
          if(err) {
            deferred.reject(
                new Error("getNextCidPromise(" + JSON.stringify(query) + "): " + err));
          } else {
            var value = obj.value.nextCid;
            console.log("getNextCidPromise(" + JSON.stringify(query) + "): success: cid=" + value);
            deferred.resolve(value);
          }
        }
    );
    return deferred.promise;
  });
}

function getNextIidPromise(uid, companyId) {
  return dbopPromise().then(function (db) {
    var deferred = Q.defer();
    var coll = db.collection("company");
    var ouid = new ObjectID(uid);
    var ocompanyId = new ObjectID(companyId);
    var query = { uid: ouid, _id: ocompanyId };
    coll.findAndModify(
        query,
        [], // sort
        { $inc: { nextIid: 1 } }, // update
        { 'new': false }, // options
        function(err, obj) {
          if(err) {
            deferred.reject(
                new Error("getNextIidPromise(" + JSON.stringify(query) + "): " + err));
          } else {
            var value = obj.value.nextIid;
            console.log("getNextIidPromise(" + JSON.stringify(query) + "): success: iid=" + value);
            deferred.resolve(value);
          }
        }
    );
    return deferred.promise;
  });
}

dropAllCollections = function() {
  var deferred = Q.defer();
  dropCollectionPromise("invite").fail(function() {
    console.log("Drop collection invite failed!");
  })
  .then(function() {
    return dropCollectionPromise("users");
  })
  .fail(function() {
    console.log("Drop collection users failed!");
  })
  .then(function () {
    return dropCollectionPromise("company");
  })
  .fail(function() {
    console.log("Drop collection company failed!");
  })
  .then(function () {
    return dropCollectionPromise("settings");
  })
  .fail(function() {
    console.log("Drop collection settings failed!");
  })
  .then(function() {
    return dropCollectionPromise("customer");
  })
  .fail(function() {
    console.log("Drop collection customer failed!");
  })
  .then(function () {
    return dropCollectionPromise("invoice");
  })
  .fail(function() {
    console.log("Drop collection invoice failed!");
  })
  .then(function () {
    return dropCollectionPromise("itemGroupTempl");
  })
  .fail(function() {
    console.log("Drop collection itemGroupTempl failed!");
  })
  .done(function() {
    deferred.resolve();
  });
  
  return deferred.promise;
};

initCollectionsRelease = function(inviteList) {
  return insertDataPromise("invite", inviteList);
};

initCollectionsDevel = function(inviteList) {
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
    console.log("getUser: User found: " + JSON.stringify(user));
    machUserId = ObjectID(user._id);
    return Q();
  })
  .then(function() {
    return getOneDocPromise('users', {"username-local": 'test'});
  })
  .then(function(user) {
    console.log("getUser: User found: " + JSON.stringify(user));
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
                         nextIid: 2000
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
                         nextIid: 4000
                       },
                       {
                         uid: testUserId,
                         name: "Test company 2",
                         addr1: "Husargatan 1",
                         addr2: "414 62 Göteborg",
                         phone: "031-123132",
                         isValid: true,
                         nextCid: 5000,
                         nextIid: 6000
                       },
                       ];
    return insertDataPromise("company", companyList);
  })
  .then(function() {
    return getOneDocPromise('company', {name: 'Machapär'});
  })
  .then(function(c) {
    console.log("getCompany: Found: " + JSON.stringify(c));
    machCompany1 = c;
    return Q();
  })
  .then(function() {
    return getOneDocPromise('company', {name: 'Test company widht a long name 1'});
  })
  .then(function(c) {
    console.log("getCompany: Found: " + JSON.stringify(c));
    testCompany1 = c;
    return Q();
  })
  .then(function() {
    return getOneDocPromise('company', {name: 'Test company 2'});
  })
  .then(function(c) {
    console.log("getCompany: Found: " + JSON.stringify(c));
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
                         iid: machCompany1Iid++,
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
                         iid: testCompany1Iid++,
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
                         iid: testCompany1Iid++,
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
                         iid: testCompany1Iid++,
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
  console.log("Init DB: devMode=" + devMode + " using mongourl: " + mongourl);

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
  dropAllCollections()
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
      },
      "activeCompany": {
        "isSet": false,
        "numCustomers": 0,
        "numInvoices": 0,
      }
  };
  
  var jobs = [
    countAllDocsPromise('company', {'isValid': true, 'uid': ouid}),
    countAllDocsPromise('customer', {'isValid': true, 'uid': ouid}),
    countAllDocsPromise('invoice', {'isValid': true, 'uid': ouid})
  ];
  
  if (companyId !== "undefined" && companyId !== "null") {
    console.log("getStats: Active company is " + companyId);
    var ocompanyId = new ObjectID(companyId);
    jobs.push(countAllDocsPromise('customer', {'isValid': true, 'uid': ouid, 'companyId': ocompanyId}));
    jobs.push(countAllDocsPromise('invoice', {'isValid': true, 'uid': ouid, 'companyId': ocompanyId}));
  }
  
  Q.all(jobs).then(function(results) {
    res.total.numCompanies = results[0];
    res.total.numCustomers = results[1];
    res.total.numInvoices = results[2];
    
    if (results.length > 3) {
      res.activeCompany.numCustomers = results[3];
      res.activeCompany.numInvoices = results[4];
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
  return updateDataPromise('settings', settings, true);
};

module.exports.getInvoices = function(uid, companyId) {
  var ouid = new ObjectID(uid);
  var ocompanyId = new ObjectID(companyId);
  return getAllDocsPromise('invoice', {'isValid': true, 'uid': ouid, 'companyId': ocompanyId});
};

module.exports.getInvoice = function(uid, id) {
  var ouid = new ObjectID(uid);
  var oid = new ObjectID(id);
  var deferred = Q.defer();
  getOneDocPromise('invoice', {'uid': ouid, '_id': oid}).then(function(invoice) {
    if (invoice == undefined) {
      console.log("getInvoice: No invoice id=" + id + " found");
      deferred.reject(new Error("The requested invoice id=" + id + " could not be found."));
    } else {
      console.log("getInvoice: Invoice found: " + invoice);
      deferred.resolve(invoice);
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
  return getOneDocPromise('customer', {'isValid': true, 'uid': ouid, '_id': oid});
};

module.exports.getCompanies = function(uid) {
  var ouid = new ObjectID(uid);
  return getAllDocsPromise('company', {'isValid': true, 'uid': ouid});
};

module.exports.getCompany = function(uid, companyId) {
  var ouid = new ObjectID(uid);
  var ocompanyId = new ObjectID(companyId);
  return getOneDocPromise('company', {'isValid': true, 'uid': ouid, '_id': ocompanyId});
};

module.exports.getItemGroupTemplates = function(uid) {
  var ouid = new ObjectID(uid);
  return getAllDocsPromise('itemGroupTempl', {'isValid': true, 'uid': ouid});
};

module.exports.addInvoice = function(uid, companyId, invoice) {
  var deferred = Q.defer();
  var ouid = new ObjectID(uid);
  var ocompanyId = new ObjectID(companyId);
  getOneDocPromise('company', {'isValid': true, 'uid': ouid, '_id': ocompanyId}).then(function(company) {
    getNextIidPromise(uid, companyId).then(function(iid) {
      console.log("addInvoice: Allocated new iid=" + iid);
      invoice.iid = iid;
      invoice.uid = ouid;
      invoice.companyId = ocompanyId;
      invoice.company = company;
      insertDataPromise('invoice', invoice).then(function() {
        deferred.resolve(invoice);
      }).fail(function(err) {
        deferred.reject(err);
      });
    }).fail(function(err) {
      console.error("addInvoice: Error: " + err.body);
      deferred.reject(err);
    });
  }).fail(function(err) {
    console.error("addInvoice: Error: " + err.body);
    deferred.reject(err);
  });
  

  return deferred.promise;
};

module.exports.updateInvoice = function(invoice) {
  var deferred = Q.defer();
  invoice.uid = new ObjectID(invoice.uid);
  invoice.companyId = new ObjectID(invoice.companyId);
  getOneDocPromise('company', {'isValid': true, 'uid': invoice.uid, '_id': invoice.companyId}).then(function(company) {
    invoice.company = company;
    updateDataPromise('invoice', invoice, true).then(function(data) {
      deferred.resolve(data);
    }).fail(function(err) {
      console.error("updateInvoice: Error: " + err.body);
      deferred.reject(err);
    });
  }).fail(function(err) {
    console.error("updateInvoice: Error: " + err.body);
    deferred.reject(err);
  });
  return deferred.promise;
};

module.exports.addCustomer = function(uid, companyId, customer) {
  var deferred = Q.defer();
  getNextCidPromise(uid, companyId).then(function(cid) {
    console.log("addCustomer: Allocated new cid=" + cid);
    customer.cid = cid;
    customer.uid = new ObjectID(uid);
    customer.companyId = new ObjectID(companyId);
    insertDataPromise('customer', customer).then(function() {
      deferred.resolve(customer);
    }).fail(function(err) {
      deferred.reject(err);
    });
  }).fail(function(err) {
    console.error("addCustomer: Error: " + err.body);
    deferred.reject(err);;
  });

  return deferred.promise;
};

module.exports.updateCustomer = function(customer) {
  customer.uid = new ObjectID(customer.uid);
  customer.companyId = new ObjectID(customer.companyId);
  return updateDataPromise('customer', customer, true);
};

module.exports.addCompany = function(uid, company) {
  var deferred = Q.defer();
  company.uid = new ObjectID(uid);
  insertDataPromise('company', company).then(function() {
    deferred.resolve(company);
  }).fail(function(err) {
    deferred.reject(err);
  });
  return deferred.promise;
};

module.exports.updateCompany = function(company) {
  company.uid = new ObjectID(company.uid);
  return updateDataPromise('company', company, false);
};

module.exports.addItemGroupTemplate = function(uid, groupTempl) {
  var deferred = Q.defer();
  groupTempl.uid = new ObjectID(uid);
  insertDataPromise('itemGroupTempl', groupTempl).then(function() {
    deferred.resolve(groupTempl);
  }).fail(function(err) {
    deferred.reject(err);
  });
  return deferred.promise;
};

module.exports.updateItemGroupTemplate = function(groupTempl) {
  groupTempl.uid = new ObjectID(groupTempl.uid);
  return updateDataPromise('itemGroupTempl', groupTempl, false);
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
      data.settings = settings.find(function(s) {
        return ouid.equals(new ObjectID(s.uid));
      });
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

module.exports.getUser = function(query, includePassword) {
  includePassword = typeof includePassword !== 'undefined' ? includePassword : false;
  var deferred = Q.defer();
  getOneDocPromise('users', query).then(function(user) {
    if (!user) {
      console.log("getUser: No user found");
      deferred.reject(new Error("The requested items could not be found."));
    } else {
      if (!includePassword) {
        delete user.password; // Do not expose password unless explicitly wanted!
      }
      console.log("getUser: User found: " + user);
      deferred.resolve(user);
    }
  });
  return deferred.promise;
};

module.exports.addUser = function(user) {
  return insertDataPromise('users', user);
};

module.exports.isEmailInvited = function(email) {
  var deferred = Q.defer();
  getOneDocPromise('invite', {email: email}).then(function(doc) {
    if (!doc) {
      console.log("isEmailInvited: email=" + email + " hasn't been invited!");
      deferred.reject(new Error("User with email " + email + " hasn't been invited!"));
    } else {
      console.log("isEmailInvited: email=" + email + " has been invited. info=" + JSON.stringify(doc));
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
      hasTotal: true
    },
    {
      uid: uid,
      name: "Detaljer (med rabatt)",
      title: "Detaljer",
      isValid: true,
      isQuickButton: false,
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
      hasTotal: true
    },
    {
      uid: uid,
      name: "Arbetstimmar",
      title: "Arbetstimmar",
      isValid: true,
      isQuickButton: true,
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
      hasTotal: true
    },
    {
      uid: uid,
      name: "Resor",
      title: "Resor",
      isValid: true,
      isQuickButton: true,
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
      hasTotal: true
    },
    {
      uid: uid,
      name: "Material (med pålägg)",
      title: "Material",
      isValid: true,
      isQuickButton: false,
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
      hasTotal: true
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
var initUserContext = function(userQuery, license) {
  license = typeof license !== 'undefined' ? license : "demo";
  var deferred = Q.defer();
  console.log("initUserContext: query=" + JSON.stringify(userQuery));
  var user = undefined;
  module.exports.getUser(userQuery).then(function (result) {
    user = result;
    console.log("initUserContext: Found user=" + JSON.stringify(user));
    return Q();
  }).then(function() {
    var defaultSettings = {
        "uid" : user._id,
        "activeCompanyId" : undefined,
        "license" : license,
    };
    console.log("initUserContext: Set default settings: " + JSON.stringify(defaultSettings));
    return insertDataPromise("settings", defaultSettings);
  }).then(function() {
    console.log("initUserContext: Set default group templates, uid=" + user._id);
    return initUserItemGroupTemplates(user._id);
  }).then(function() {
    deferred.resolve(user);
  }).fail(function(err) {
    deferred.reject(err);
  });
  
  return deferred.promise;
};

module.exports.initUserContext = initUserContext;
