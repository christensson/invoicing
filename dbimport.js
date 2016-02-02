var args = require('commander');
var mydb = require('./mydb.js');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var Q = require('q');
var Converter = require("csvtojson").Converter;
var converter = new Converter({});

function increaseVerbosity(v, total) {
  return total + 1;
}

args.version('0.0.1')
.option('--real_db', 'Init real DB, not local development DB')
.option('--uid [id]', 'Import to user')
.option('--cid [id]', 'Import to company')
.option('--cust_csv [file]', 'Import customer CSV file to user and company')
.option('-v, --verbose', 'Be more verbose', increaseVerbosity, 0)
.parse(process.argv);

console.log("DB importer!");

var devMode = false;

if (!args.real_db) {
  console.log("Using local DB!");
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
    console.log("No user or company id given, specify with option --uid and --cid");
    process.exit(1);
  }
  console.log("Going to import customers in file " + args.cust_csv + " to uid=" + args.uid + ", cid=" + args.cid);
  var ouid = ObjectID(args.uid);
  var ocid = ObjectID(args.cid);
  converter.fromFile(args.cust_csv, function(err, result) {
    if (err) {
      console.err("Error when converting file to JSON: " + err);
      process.exit(1);
    }
    if (args.verbose > 1) {
      console.log("CSV converted to JSON: " + JSON.stringify(result));
    }
    var successCount = 0;
    var cs = [];
    for (var i = 0; i < result.length; i++) {
      var c = convertCustomer(result[i], ouid, ocid);
      cs.push(c);
      if (args.verbose) {
        console.log("Converted customer id=" + c.cid + ", data=" + JSON.stringify(c));
      } else {
        console.log("Converted customer id=" + c.cid + ", name=" + c.name);
      }
      successCount++;
    }
    console.log("Successfully converted " + successCount + " out of " + result.length + " customers.");
    mydb.addCustomerRaw(cs).then(function() {
      console.log("Successfully added " + successCount + " customers to DB.");
      console.log("Done!");
      process.exit();
    }).fail(function(err) {
      console.log("Insertion in DB failed! err=" + err);
      process.exit(1);
    });
  });
}
