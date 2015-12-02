# Invoicing
## Tool dependencies
* nodejs
* mongodb

## Frameworks
### Client
* Knockout JS: http://knockoutjs.com/documentation/introduction.html
* Bootstrap: http://getbootstrap.com (CSS, Glyphicons)
* Director: https://github.com/flatiron/director (Routing)
* Locale flag icons: http://www.famfamfam.com/lab/icons/flags/

### Server
* Express JS: http://expressjs.com/4x/api.html
* Marko: http://markojs.com/ (Rendering HTML)
* Passport: http://passportjs.org/ (Authentication)
* Fluentreports: http://www.fluentreports.com/docs.html (PDFs)
* Multer: https://github.com/expressjs/multer (Multipart form post)
* MongoDb:
** node-js driver: http://mongodb.github.io/node-mongodb-native/2.0/api/

## Structure
### Client
* Signin
  * public/signin.js
  * views/signin.marko

* Main application
  * public/page.js
  * views/app.marko

* Notifications (used both in signin and main application)
  * public/notification.js
  * views/notification.marko

### Server
* app.js - Binds server code together, all get/put/post handlers
* functions.js - Authentication logic
* mydb.js - Database abstraction

## TODO
- [x] Add more fields to company that needs to show on invoice: vat reg nr, custom text, ...
- [x] Feature: Currency rounding for totals ("öresutjämning")
- [ ] Feature: Currency rounding improvement: optional, more variants since "öresutjämning" doesn't work that good for more valuable currencies...
- [ ] Feature: Configurable currencies, default selected per customer
- [ ] Translations
- [x] Settings: ?
- [ ] Feature: Invoice detail types
- [x] Feature: Copy invoice (SHA: 494f491c20950cda86aaefde82a05b5708396572)
- [x] Feature: More authentication methods (other than local)
- [x] Fix customer input. Proper form is needed, not just table view.
- [ ] Fix company input. Currently the logo has to be uploaded in a separate form. The upload should be made using the same save button.
- [x] Add licenced features, demo invoice

## Bugs
Use GitHub issue tracker.
