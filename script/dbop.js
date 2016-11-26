var args = require('commander');
var mydb = require('../lib/mydb');
var Q = require('q');
var Converter = require("csvtojson").Converter;
var converter = new Converter({});
var log = require('../lib/log');

function increaseVerbosity(v, total) {
  return total + 1;
}

function list(val) {
  return val.split(',');
}

args.version('0.0.1')
.option('--real_db', 'Work on real DB, not local development DB')
.option('--uid [id]', 'User to operate on')
.option('--cid [id]', 'Company to operate on')
.option('--cust_csv [file]', 'Import customer CSV file to user and company')
.option('--types_csv [file]', 'Import types CSV file as group templates to user')
.option('--rm', 'Removes user and all associated documents')
.option('--get', 'Gets user and all associated documents')
.option('--gendata [num_customers],[num_invoices],[tag]', 'Generate debug customers and invoices to user', list)
.option('--invoice [file]', 'Invoice described as JSON file to use for gendata')
.option('-v, --verbose', 'Be more verbose', increaseVerbosity, 0)
.option('-d, --dryrun', 'Dry-run, don\'t modify DB')
.parse(process.argv);

log.remove(log.transports.file); // Do not log to file!

switch(args.verbose) {
  case undefined:
  case 0:
    break;
  case 1:
    log.transports.console.level = 'verbose';
    break;
  case 2:
    log.transports.console.level = 'debug';
    break;
  default:
  case 3:
    log.transports.console.level = 'silly';
    break;
}
log.info("Log level: console: " + log.transports.console.level);

log.info("DB commandline tool!");

var devMode = false;

if (!args.real_db) {
  log.info("Using local DB!");
  mydb.setLocalDb();
}

var getJsonFromFile = function(fileName) {
  var deferred = Q.defer();
  require('fs').readFile(fileName, 'utf8', function (err, data) {
    if (err) {
      deferred.reject(err);
      return;
    }
    var obj = JSON.parse(data);
    log.verbose("Invoice will be rendered from JSON: " + JSON.stringify(obj, null, 2));
    deferred.resolve(obj);
  });
  return deferred.promise;
};


var convertCustomer = function(c, ouid, ocid) {
  /* Input fields:
   * Kundnr
   * Namn
   * ExtraAdress
   * Adress
   * Postadress
   * Kontaktperson
   * TelBostad (phone3)
   * TelArbete (phone2)
   * TelMobil (phone1)
   * Fax (not imported)
   * AlternativTelefon (not imported)
   * E-post
   * OmvandSkattskyldighet
   * Momsregnr
   */
  var res = {
    cid: c['Kundnr'],
    uid: ouid,
    companyId: ocid,
    name: c['Namn'],
    addr1: c['Adress'],
    addr2: c['Postadress'],
    addr3: c['ExtraAdress'],
    phone1: c['TelMobil'],
    phone2: c['TelArbete'],
    phone3: c['TelBostad'],
    contact: c['Kontaktperson'],
    email: c['E-post'],
    vatNr: c['Momsregnr'],
    defaultNumDaysUntilPayment: 30,
    useReverseCharge: c['OmvandSkattskyldighet'],
    isValid: true
  };
  return res;
};

if (args.cust_csv) {
  if (!args.uid || !args.cid) {
    log.error("No user or company id given, specify with option --uid and --cid");
    process.exit(1);
  }
  log.info("Going to import customers in file " + args.cust_csv + " to uid=" + args.uid + ", cid=" + args.cid);
  var ouid = mydb.toObjectId(args.uid);
  var ocid = mydb.toObjectId(args.cid);
  converter.fromFile(args.cust_csv, function(err, result) {
    if (err) {
      log.error("Error when converting file to JSON: " + err);
      process.exit(1);
    }
    log.debug("CSV converted to JSON: " + JSON.stringify(result));
    var successCount = 0;
    var cs = [];
    for (var i = 0; i < result.length; i++) {
      var c = convertCustomer(result[i], ouid, ocid);
      cs.push(c);
      log.info("Converted customer id=" + c.cid + ", name=" + c.name);
      log.verbose("Converted customer id=" + c.cid + ", data=" + JSON.stringify(c));
      successCount++;
    }
    log.info("Successfully converted " + successCount + " out of " + result.length + " customers.");
    if (args.dryrun) {
      log.info("This is a dry-run, nothing imported to DB!");
      log.info("Done!");
      process.exit();
    } else {
      mydb.addCustomerRaw(cs).then(function() {
        log.info("Successfully added " + successCount + " customers to DB.");
        log.info("Done!");
        process.exit();
      }).fail(function(err) {
        log.error("Insertion in DB failed! err=" + err);
        process.exit(1);
      });
    }
  });
}


var convertTypeToGroup = function(t, uid) {
  /* Input fields
   * Typid (not imported)
   * Typnamn
   * Typbeskrivning
   * VisaAntal
   * VisaParameter (not imported)
   * VisaPåslag
   * ParameterEtikett (not imported)
   * AntalEtikett
   * APrisEtikett
   * PåslagEtikett
   * SorteringsId (not imported)
   * EndastText
   */
  var res = {
    uid: ouid,
    name: t['Typnamn'],
    title: t['Typbeskrivning'],
    isValid: true,
    isQuickButton: false,
    titleExtraField: "",
    hasTitleExtraField: false,
    descColLbl: "Beskrivning",
    priceColLbl: t['APrisEtikett'],
    countColLbl: t['AntalEtikett'],
    discountColLbl: t['PåslagEtikett'],
    vatColLbl: "Moms",
    totalColLbl: "Belopp",
    hasDesc: true,
    hasPrice: true,
    hasCount: t['VisaAntal'],
    hasDiscount: t['VisaPåslag'],
    negateDiscount: true,
    hasVat: true,
    hasTotal: true
  };
  if (t['EndastText']) {
    res.descColLbl = "";
    res.hasDesc = true;
    res.hasPrice = false;
    res.hasCount = false;
    res.hasDiscount = false;
    res.hasVat = false;
    res.hasTotal = false;
  }
  return res;
};

if (args.types_csv) {
  if (!args.uid) {
    log.error("No user id given, specify with option --uid");
    process.exit(1);
  }
  log.info("Going to import types in file " + args.types_csv + " to uid=" + args.uid);
  var ouid = mydb.toObjectId(args.uid);
  converter.fromFile(args.types_csv, function(err, result) {
    if (err) {
      log.error("Error when converting file to JSON: " + err);
      process.exit(1);
    }
    log.debug("CSV converted to JSON: " + JSON.stringify(result, null, 2));
    var successCount = 0;
    var groups = [];
    for (var i = 0; i < result.length; i++) {
      var g = convertTypeToGroup(result[i], ouid);
      groups.push(g);
      log.info("Converted group name=" + g.name);
      log.verbose("Converted group name=" + g.name + ", data=" + JSON.stringify(g));
      successCount++;
    }
    log.info("Successfully converted " + successCount + " out of " + result.length + " groups.");
    if (args.dryrun) {
      log.info("This is a dry-run, nothing imported to DB!");
      log.info("Done!");
      process.exit();
    } else {
      mydb.addItemGroupTemplateRaw(groups).then(function() {
        log.info("Successfully added " + successCount + " groups to DB.");
        log.info("Done!");
        process.exit();
      }).fail(function(err) {
        log.error("Insertion in DB failed! err=" + err);
        process.exit(1);
      });
    }
  });
}

var getAllUserData = function(uid) {
  var deferred = Q.defer();
  var ouid = mydb.toObjectId(uid);

  var user = null;
  var settings = null;
  var companies = null;
  var customers = null;
  var invoices = null;
  var offers = null;
  var itemGroupTemplates = null;
  var articles = null;

  var failureHdlr = function(msg, err) {
    deferred.reject({
      "msg": msg,
      "err": err
    });
  }

  mydb.getUser({_id: ouid})
    .fail(function(err) {
      if (err.message == 'The requested items could not be found.') {
        log.verbose("User with uid=" + uid + " not found!");
        return Q.fcall(function() {
          return null;
        });
      } else {
        failureHdlr("Get user error", err);
      }
    })
    .then(function(doc) {
      user = doc;
      if (user === null) {
        log.info("No user found");
      } else {
        log.info("User found: " + JSON.stringify(user, null, 2));
      }
      return mydb.getSettings(uid);
    })
    .fail(failureHdlr.bind("Settings for uid=" + uid + " not found!"))
    .then(function(doc) {
      settings = doc;
      if (settings === null) {
        log.info("No settings found");
      } else {
        log.info("Settings found");
      }
      log.verbose("Settings found: " + JSON.stringify(settings, null, 2));
      return mydb.getAllDocsPromise('company', {'uid': ouid})
    })
    .fail(failureHdlr.bind("Companies for uid=" + uid + " not found!"))
    .then(function(doc) {
      companies = doc;
      log.info(companies.length + " companies found!");
      log.verbose("Companies found: " + JSON.stringify(companies, null, 2));
      return mydb.getAllDocsPromise('customer', {'uid': ouid})
    })
    .fail(failureHdlr.bind("Customers for uid=" + uid + " not found!"))
    .then(function(doc) {
      customers = doc;
      log.info(customers.length + " customers found!");
      log.verbose("Customers found: " + JSON.stringify(customers, null, 2));
      return mydb.getAllDocsPromise('invoice', {'uid': ouid})
    })
    .fail(failureHdlr.bind("Invoices for uid=" + uid + " not found!"))
    .then(function(doc) {
      invoices = doc;
      log.info(invoices.length + " invoices found!");
      log.verbose("Invoices found: " + JSON.stringify(invoices, null, 2));
      return mydb.getAllDocsPromise('offer', {'uid': ouid})
    })
    .fail(failureHdlr.bind("Offers for uid=" + uid + " not found!"))
    .then(function(doc) {
      offers = doc;
      log.info(offers.length + " offers found!");
      log.verbose("Offers found: " + JSON.stringify(offers, null, 2));
      return mydb.getAllDocsPromise('itemGroupTempl', {'uid': ouid})
    })
    .fail(failureHdlr.bind("ItemGroupTemplates for uid=" + uid + " not found!"))
    .then(function(doc) {
      itemGroupTemplates = doc;
      log.info(itemGroupTemplates.length + " ItemGroupTemplates found!");
      log.verbose("ItemGroupTemplates found: " + JSON.stringify(itemGroupTemplates, null, 2));
      return mydb.getAllDocsPromise('article', {'uid': ouid})
    })
    .fail(failureHdlr.bind("Articles for uid=" + uid + " not found!"))
    .then(function(doc) {
      articles = doc;
      log.info(articles.length + " Articles found!");
      log.verbose("Articles found: " + JSON.stringify(articles, null, 2));
    })
    .done(function() {
      deferred.resolve({
        "user": user,
        "settings": settings,
        "companies": companies,
        "customers": customers,
        "invoices": invoices,
        "offers": offers,
        "itemGroupTemplates": itemGroupTemplates,
        "articles": articles,
      });
    });

  return deferred.promise;
}

var query = function(rl, msg, yesIsDefault, illegalIsNo) {
  yesIsDefault = typeof yesIsDefault !== 'undefined' ? yesIsDefault : true;
  illegalIsNo = typeof illegalIsNo !== 'undefined' ? illegalIsNo : true;
  var deferred = Q.defer();
  var answerStr = yesIsDefault?' [Y/n] ':' [y/N] ';

  rl.question(msg + answerStr, (answer) => {
    // If no answer, set default
    if (answer.length === 0) {
      answer = yesIsDefault?'y':'n';
    }
    switch (answer.toLowerCase()) {
      case 'y':
      case 'yes':
        deferred.resolve(true);
        break;
      case 'n':
      case 'no':
        deferred.resolve(false);
        break;
      default:
        if (illegalIsNo) {
          deferred.resolve(false);
        } else {
          deferred.reject("Illegal answer: " + answer);
        }
        break;
    }
  });
  return deferred.promise;
};

var rmAllUserData = function(uid, data, dryrun) {
  dryrun = typeof dryrun !== 'undefined' ? dryrun : false;
  var deferred = Q.defer();
  var ouid = mydb.toObjectId(uid);

  var readline = require('readline');
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  var queryIfElse = function(rl, msg, cond, elseResult) {
    if (cond) {
      return query(rl, msg, false);
    } else {
      return Q.fcall(function() {
        return elseResult;
      });
    }
  };

  var logDeleteResult = function(deleteCount) {
    if (deleteCount !== undefined) {
      log.info("%d documents deleted", deleteCount);
    }
    return Q();
  };

  var returnMyArgument = function(arg) {
    return arg;
  }

  Q()
    .then(function() {
      var numItems = data.articles.length;
      return queryIfElse(rl, "Remove " + numItems + " articles?", numItems > 0, false);
    })
    .then(function(yes) {
      if (yes && !dryrun) {
        log.info("Removing %d articles!", data.articles.length);
        return mydb.deleteAllDocsPromise('article', {uid: ouid});
      } else {
        return Q.fcall(returnMyArgument.bind(null, undefined));
      }
    })
    .then(logDeleteResult)
    .then(function() {
      var numItems = data.itemGroupTemplates.length;
      return queryIfElse(rl, "Remove " + numItems + " itemGroupTemplates?", numItems > 0, false);
    })
    .then(function(yes) {
      if (yes && !dryrun) {
        log.info("Removing %d itemGroupTemplates!", data.itemGroupTemplates.length);
        return mydb.deleteAllDocsPromise('itemGroupTempl', {uid: ouid});
      } else {
        return Q.fcall(returnMyArgument.bind(null, undefined));
      }
    })
    .then(logDeleteResult)
    .then(function() {
      var numItems = data.invoices.length;
      return queryIfElse(rl, "Remove " + numItems + " invoices?", numItems > 0, false);
    })
    .then(function(yes) {
      if (yes && !dryrun) {
        log.info("Removing %d invoices!", data.invoices.length);
        return mydb.deleteAllDocsPromise('invoice', {uid: ouid});
      } else {
        return Q.fcall(returnMyArgument.bind(null, undefined));
      }
    })
    .then(logDeleteResult)
    .then(function() {
      var numItems = data.offers.length;
      return queryIfElse(rl, "Remove " + numItems + " offers?", numItems > 0, false);
    })
    .then(function(yes) {
      if (yes && !dryrun) {
        log.info("Removing %d offers!", data.offers.length);
        return mydb.deleteAllDocsPromise('offer', {uid: ouid});
      } else {
        return Q.fcall(returnMyArgument.bind(null, undefined));
      }
    })
    .then(logDeleteResult)
    .then(function() {
      var numItems = data.customers.length;
      return queryIfElse(rl, "Remove " + numItems + " customers?", numItems > 0, false);
    })
    .then(function(yes) {
      if (yes && !dryrun) {
        log.info("Removing %d customers!", data.customers.length);
        return mydb.deleteAllDocsPromise('customer', {uid: ouid});
      } else {
        return Q.fcall(returnMyArgument.bind(null, undefined));
      }
    })
    .then(logDeleteResult)
    .then(function() {
      var numItems = data.companies.length;
      return queryIfElse(rl, "Remove " + numItems + " companies?", numItems > 0, false);
    })
    .then(function(yes) {
      if (yes && !dryrun) {
        log.info("Removing %d companies!", data.companies.length);
        return mydb.deleteAllDocsPromise('company', {uid: ouid});
      } else {
        return Q.fcall(returnMyArgument.bind(null, undefined));
      }
    })
    .then(logDeleteResult)
    .then(function() {
      return queryIfElse(rl, "Remove settings?", data.settings !== null, false);
    })
    .then(function(yes) {
      if (yes && !dryrun) {
        log.info("Removing settings! settings=" + JSON.stringify(data.settings, null, 2));
        return mydb.deleteAllDocsPromise('settings', {uid: ouid});
      } else {
        return Q.fcall(returnMyArgument.bind(null, undefined));
      }
    })
    .then(logDeleteResult)
    .then(function() {
      return queryIfElse(rl, "Remove user?", data.user !== null, false);
    })
    .then(function(yes) {
      if (yes && !dryrun) {
        log.info("Removing user! user=" + JSON.stringify(data.user, null, 2));
        return mydb.deleteAllDocsPromise('users', {_id: ouid});
      } else {
        return Q.fcall(returnMyArgument.bind(null, undefined));
      }
    })
    .then(logDeleteResult)
    .then(function() {})
    .fin(function() {
      rl.close();
    })
    .catch(function(err) {
      deferred.reject(err);
    })
    .done(function() {
      deferred.resolve();
    });

  return deferred.promise;
}

if (args.get || args.rm) {
  if (!args.uid) {
    log.error("No user id given, specify with option --uid");
    process.exit(1);
  }

  var uid = args.uid;
  log.info("Going to dump user with uid=" + uid);
  getAllUserData(uid)
    .fail(function(errJson) {
      log.error(errJson.msg);
      log.error("Error: " + errJson.err);
      process.exit(1);
    })
    .then(function(result) {
      if (args.rm) {
        return rmAllUserData(uid, result, args.dryrun);
      } else {
        return Q();
      }
    })
    .fail(function(err) {
      log.error("Error: " + err);
    })
    .done(function() {
      log.info("Done!");
      process.exit(0);
    });
}

if (args.gendata) {
  if (!args.uid || !args.cid) {
    log.error("No user or company id given, specify with option --uid and --cid");
    process.exit(1);
  }

  if (args.gendata.length != 3) {
    log.error("--gendata requires three comma-separated arguments for number of customers, invoices and a tag");
    process.exit(1);
  }

  if (!args.invoice) {
    log.error("--gendata requires --invoice to specify an invoice JSON file");
    process.exit(1);
  }

  var createCustomers = function(uid, companyId, count, tag) {
    var ouid = mydb.toObjectId(uid);
    var ocompanyId = mydb.toObjectId(companyId);
    var customer = {
      "name" : "Customer ",
      "addr1" : "Some street 2",
      "addr2" : "Some region",
      "addr3" : "",
      "phone1" : "",
      "phone2" : "",
      "phone3" : "",
      "vatNr" : "",
      "email" : "",
      "noVat" : false,
      "useReverseCharge" : false,
      "contact" : "",
      "isValid" : true,
      "invoiceLng" : "sv",
      "currency" : "SEK",
      "cid" : 100000,
      "updateCount" : 0,
      "loadGenTag": tag,
    };
    var customers = [];

    for (var i = 0; i < count; i++) {
      var c = JSON.parse(JSON.stringify(customer));
      c.name = c.name + i;
      c.uid = ouid;
      c.companyId = ocompanyId;
      c.cid = c.cid + i;
      customers.push(c);
    }
    return mydb.addCustomerRaw(customers);
  };

  var createInvoices = function(uid, companyId, invoiceBase, customers, count, tag) {
    var ouid = mydb.toObjectId(uid);
    var ocompanyId = mydb.toObjectId(companyId);
    var invoices = [];
    for (var i = 0; i < count; i++) {
      var invoice = JSON.parse(JSON.stringify(invoiceBase));
      var customerIdx = Math.floor(Math.random() * customers.length);
      delete invoice._id;
      invoice.uid = ouid;
      invoice.customer = customers[customerIdx];
      invoice.customer._id = mydb.toObjectId(invoice.customer._id);
      invoice.companyId = ocompanyId;
      invoice.company._id = ocompanyId;
      invoice.iid = 10000 + i;
      invoice.loadGenTag = tag;
      var invoiceAgeInDays = Math.floor(Math.random() * 50);
      var invoiceDate = new Date(Date.now() - (invoiceAgeInDays * 24 * 60 * 60 * 1000));
      invoice.date = invoiceDate.toISOString().split("T")[0];
      invoices.push(invoice);
    }
    return mydb.addInvoiceRaw(invoices);
  };

  var uid = args.uid;
  var cid = args.cid;
  var ouid = mydb.toObjectId(uid);
  var ocid = mydb.toObjectId(cid);
  var numCustomers = args.gendata[0];
  var numInvoices = args.gendata[1];
  var tag = args.gendata[2];
  var customers = undefined;
  var company = undefined;
  var invoice = undefined;
  log.info("Going to generate " + numCustomers + " customers and " +
    numInvoices + " invoices with tag " + tag + " to user with uid=" + uid);
  mydb.getOneDocPromise('company', {'uid': ouid, '_id': ocid})
    .fail(function(err) {
      log.error("Company with cid=" + cid + " not found! err=" + err);
      process.exit(1);
    })
    .then(function(doc) {
      company = doc;
      log.verbose("Company " + company.name + " found");
      return getJsonFromFile(args.invoice);
    })
    .fail(function(err) {
      log.error("Failed to read invoice JSON file " + args.invoice + ": err=" + JSON.stringify(err));
      process.exit(1);
    })
    .then(function(invoiceData) {
      invoice = invoiceData;
      return createCustomers(uid, cid, numCustomers, tag);
    })
    .fail(function(err) {
      log.error("Failed to create customers: err=" + JSON.stringify(err));
      process.exit(1);
    })
    .then(function(results) {
      log.info("%d customers created", numCustomers);
      return mydb.getAllDocsPromise('customer', {'uid': ouid, 'companyId': ocid, 'loadGenTag': String(tag)})
    })
    .fail(function(err) {
      log.error("Failed to get customers: err=" + JSON.stringify(err));
      process.exit(1);
    })
    .then(function(docs) {
      customers = docs;
      log.info("%d customers read from DB with loadGenTag=%s", customers.length, tag);
      invoice.company = company;
      return createInvoices(uid, cid, invoice, customers, numInvoices, tag);
    })
    .fail(function(err) {
      log.error("Failed to create invoices: err=" + JSON.stringify(err));
      process.exit(1);
    })
    .then(function(results) {
      log.info("%d invoices created", numInvoices);
    })
    .done(function() {
      log.info("Done!");
      process.exit(0);
    });
}
