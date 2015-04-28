this["dodgercms"] = this["dodgercms"] || {};
this["dodgercms"]["templates"] = this["dodgercms"]["templates"] || {};

this["dodgercms"]["templates"]["nav.html"] = Handlebars.template({"1":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers.unless.call(depth0,(depth0 != null ? depth0.index : depth0),{"name":"unless","hash":{},"fn":this.program(2, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "");
},"2":function(depth0,helpers,partials,data) {
    var stack1, helper, options, alias1=helpers.helperMissing, alias2="function", alias3=this.escapeExpression, buffer = 
  "	        <li class=\"pure-menu-item "
    + ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.children : depth0),{"name":"if","hash":{},"fn":this.program(3, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "\"><a href=\""
    + ((stack1 = ((helper = (helper = helpers.endpoint || (depth0 != null ? depth0.endpoint : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"endpoint","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + alias3(((helper = (helper = helpers.key || (depth0 != null ? depth0.key : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"key","hash":{},"data":data}) : helper)))
    + "\" class=\"pure-menu-link\">"
    + alias3(((helper = (helper = helpers.label || (depth0 != null ? depth0.label : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"label","hash":{},"data":data}) : helper)))
    + "</a></li>\n";
  stack1 = ((helper = (helper = helpers.children || (depth0 != null ? depth0.children : depth0)) != null ? helper : alias1),(options={"name":"children","hash":{},"fn":this.program(5, data, 0),"inverse":this.noop,"data":data}),(typeof helper === alias2 ? helper.call(depth0,options) : helper));
  if (!helpers.children) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer;
},"3":function(depth0,helpers,partials,data) {
    return "has-children";
},"5":function(depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = this.invokePartial(partials['menu.html'],depth0,{"name":"menu.html","data":data,"indent":"\t            ","helpers":helpers,"partials":partials})) != null ? stack1 : "");
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1, helper, options, alias1=helpers.helperMissing, alias2="function", buffer = 
  "<div class=\"pure-menu\">\n    <a class=\"pure-menu-heading\" href=\""
    + ((stack1 = ((helper = (helper = helpers.endpoint || (depth0 != null ? depth0.endpoint : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"endpoint","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "\"><img src=\""
    + ((stack1 = ((helper = (helper = helpers.endpoint || (depth0 != null ? depth0.endpoint : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"endpoint","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + ".dodgercms/logo.png\"></a>\n    <ul class=\"pure-menu-list\">\n";
  stack1 = ((helper = (helper = helpers.nav || (depth0 != null ? depth0.nav : depth0)) != null ? helper : alias1),(options={"name":"nav","hash":{},"fn":this.program(1, data, 0),"inverse":this.noop,"data":data}),(typeof helper === alias2 ? helper.call(depth0,options) : helper));
  if (!helpers.nav) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "    </ul>\n</div>";
},"usePartial":true,"useData":true});