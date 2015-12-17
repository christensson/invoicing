var fs = require('fs');

function setup(ssl) {
  if (ssl && ssl.active) {
    return {
      key  : fs.readFileSync(ssl.key),
      cert : fs.readFileSync(ssl.certificate)
    };
  }
}

function start (app, options) {
  if (options) {
    return require('https').createServer(options, app);
  }

  return require('http').createServer(app);
}

module.exports = {
  create: function (settings, app, cb) {
    var options = setup(settings.ssl);
    return start(app, options).listen(settings.port, cb);
  }
};