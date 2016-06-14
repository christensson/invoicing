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
* Font Awesome: http://fontawesome.io/icons/

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
