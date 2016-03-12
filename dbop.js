var args = require('commander');
var mydb = require('./mydb.js');
var Q = require('q');
var Converter = require("csvtojson").Converter;
var converter = new Converter({});
var log = require('./log');

function increaseVerbosity(v, total) {
  return total + 1;
}

args.version('0.0.1')
.option('--real_db', 'Work on real DB, not local development DB')
.option('--uid [id]', 'User to operate on')
.option('--cid [id]', 'Company to operate on')
.option('--cust_csv [file]', 'Import customer CSV file to user and company')
.option('--types_csv [file]', 'Import types CSV file as group templates to user')
.option('--rm', 'Removes user and all associated documents')
.option('--get', 'Gets user and all associated documents')
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
  var invoices = null;
  var customers = null;
  var itemGroupTemplates = null;

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
      return mydb.getAllDocsPromise('itemGroupTempl', {'uid': ouid})
    })
    .fail(failureHdlr.bind("ItemGroupTemplates for uid=" + uid + " not found!"))
    .then(function(doc) {
      itemGroupTemplates = doc;
      log.info(itemGroupTemplates.length + " ItemGroupTemplates found!");
      log.verbose("ItemGroupTemplates found: " + JSON.stringify(itemGroupTemplates, null, 2));
    })
    .done(function() {
      deferred.resolve({
        "user": user,
        "settings": settings,
        "customers": customers,
        "invoices": invoices,
        "itemGroupTemplates": itemGroupTemplates
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
