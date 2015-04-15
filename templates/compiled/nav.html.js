this["dodgercms"] = this["dodgercms"] || {};
this["dodgercms"]["templates"] = this["dodgercms"]["templates"] || {};

this["dodgercms"]["templates"]["nav.html"] = Handlebars.template({"1":function(depth0,helpers,partials,data) {
    var stack1, helper, options, alias1=helpers.helperMissing, alias2="function", buffer = 
  "        <li class=\"pure-menu-item\"><a href=\"#\" class=\"pure-menu-link\">"
    + this.escapeExpression(((helper = (helper = helpers.label || (depth0 != null ? depth0.label : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"label","hash":{},"data":data}) : helper)))
    + "</a></li>\n";
  stack1 = ((helper = (helper = helpers.children || (depth0 != null ? depth0.children : depth0)) != null ? helper : alias1),(options={"name":"children","hash":{},"fn":this.program(2, data, 0),"inverse":this.noop,"data":data}),(typeof helper === alias2 ? helper.call(depth0,options) : helper));
  if (!helpers.children) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer;
},"2":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = this.invokePartial(partials['menu.html'],depth0,{"name":"menu.html","data":data,"indent":"            ","helpers":helpers,"partials":partials})) != null ? stack1 : "");
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "<div class=\"pure-menu\">\n    <a class=\"pure-menu-heading\" href=\"#\">Company</a>\n    <ul class=\"pure-menu-list\">\n";
  stack1 = ((helper = (helper = helpers.nav || (depth0 != null ? depth0.nav : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"nav","hash":{},"fn":this.program(1, data, 0),"inverse":this.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0,options) : helper));
  if (!helpers.nav) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "    </ul>\n</div>";
},"usePartial":true,"useData":true});