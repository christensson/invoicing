# Invoicing
## Tool dependencies
* nodejs
* mongodb

## Frameworks
### Client
* Knockout JS: http://knockoutjs.com/documentation/introduction.html
* Bootstrap: http://getbootstrap.com (CSS, Glyphicons)
* Director: https://github.com/flatiron/director (Routing)

### Server
* Express JS: http://expressjs.com/4x/api.html
* Marko: http://markojs.com/ (Rendering HTML)
* Passport: http://passportjs.org/ (Authentication)
* Fluentreports: http://www.fluentreports.com/docs.html (PDFs)
* Multer: https://github.com/expressjs/multer (Multipart form post)

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
* mydb.hs - Database abstraction

## TODO
- [ ] Add more fields to company that needs to show on invoice: vat reg nr, custom text, ...
- [ ] Feature: Currency rounding for totals ("öresutjämning")
- [ ] Translations
- [ ] Settings: ?
- [ ] Feature: Invoice detail types
- [ ] Feature: Copy invoice
- [ ] Feature: More authentication methods (other than local)
- [ ] Fix company input. Currently the logo has to be uploaded in a separate form. The upload should be made using the same save button.

## Bugs
- [ ] Placeholder