var template = require('./template.marko');

exports.renderer = function(input, out) {
  template.render({
    icon: input.icon,
    text: input.text,
    isExplicitIcon: input.isExplicitIcon,
  }, out);
};
