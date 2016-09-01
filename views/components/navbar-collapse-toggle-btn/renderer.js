var template = require('./template.marko');

exports.renderer = function(input, out) {
  template.render({
    target: input.target
  }, out);
};
