var template = require('./template.marko');
 
exports.renderer = function(input, out) {
  var iconCss = input.isExplicitIcon?'':'fa-' + input.icon;
  var iconAttrCss = 'fa';
  if (input.fw) {
    iconAttrCss = iconAttrCss + " fa-fw";
  }
  if (input.lg) {
    iconAttrCss = iconAttrCss + " fa-lg";
  }
  var cond = input.cond;
  if (typeof cond == 'undefined' || cond == 'undefined') {
    cond = "true";
  }
  var cssAttr = iconAttrCss + " " + iconCss + " " + input.extraClass;
  template.render({
    cond: cond,
    cssAttr: cssAttr,
    tooltip: input.tooltip
  }, out);
};
