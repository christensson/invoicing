var args = require('commander');
var mydb = require('./mydb.js');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var Q = require('q');
var Converter = require("csvtojson").Converter;
var converter = new Converter({});
var log = require('./log');

function increaseVerbosity(v, total) {
  return total + 1;
}

args.version('0.0.1')
.option('--real_db', 'Init real DB, not local development DB')
.option('--uid [id]', 'Import to user')
.option('--cid [id]', 'Import to company')
.option('--cust_csv [file]', 'Import customer CSV file to user and company')
.option('--types_csv [file]', 'Import types CSV file as group templates to user')
.option('-v, --verbose', 'Be more verbose', increaseVerbosity, 0)
.option('-d, --dryrun', 'Dry-run, don\'t modify DB')
.parse(process.argv);

switch(args.verbose) {
  case undefined:
  case 0:
    break;
  case 1:
    log.level = 'verbose';
    break;
  case 2:
    log.level = 'debug';
    break;
  default:
  case 3:
    log.level = 'silly';
    break;
}
log.info("Log level is " + log.level);

log.info("DB importer!");

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
  var ouid = ObjectID(args.uid);
  var ocid = ObjectID(args.cid);
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
  var ouid = ObjectID(args.uid);
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
