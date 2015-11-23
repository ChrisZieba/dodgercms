/* Backbone Data Type Globals */
var DATATYPE = Backbone.Model.extend({
   id: {}, //unique identifier
   name: {}, //displayed in select chooser
   partial: {}
});

/*
 * Data Type Partials
 * Pass the id of the form elements to the before_after_split helper function
 */
 var PARTIALS_PATH = 'public/js/data-types/partials/';
 var DATATYPES = new Backbone.Collection([
  /* Basic HTML Template */
  {id: 'html', name: 'HTML'},
  {id: 'markdown', name: 'Markdown'},

   /* Multiple Text Items (and other examples) */
   {id: 'multiples', name: 'Multiple Text Items'}

 ], {model: DATATYPE}
);

//load the partials files
_.each(DATATYPES.models, function(element){
  $.get(PARTIALS_PATH + element.get('id') + '.html', function(data){
    element.set('partial', data);
    //register the partials for the data type forms
    Handlebars.registerPartial('data-type-is-'+ element.get('id'), element.get('partial'));
  });
});
