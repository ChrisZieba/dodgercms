DodgerCMS keeps an up to date list of all entries which you can use to build a menu or navigation system for your website. The data `JSON` file stored could look something like what you see below. It is structured in such a way that the children entries are nested with their parent.

```json
[
  {
    "key": "features/",
    "part": "features",
    "index": false,
    "link": "features/",
    "label": "Features",
    "children": [
      {
        "key": "features/editor",
        "part": "editor",
        "index": false,
        "link": "features/editor",
        "label": "Editor",
        "children": false
      }
    ]
  },
  {
    "key": "help/",
    "part": "help",
    "index": false,
    "link": null,
    "label": "Help",
    "children": [
      {
        "key": "help/editor/",
        "part": "editor",
        "index": false,
        "link": null,
        "label": "editor",
        "children": [
          {
            "key": "help/editor/add-entry",
            "part": "add-entry",
            "index": false,
            "link": "help/editor/add-entry",
            "label": "Add an Entry",
            "children": false
          }
        ]
      }
    ]
  },
  {
    "key": "index",
    "part": "index",
    "index": true,
    "link": "index",
    "label": "DodgerCMS",
    "children": false
  }
]
```

With a little bit of JavaScript we can request the `JSON` and parse it to build a menu.

```js
var request = new XMLHttpRequest();
request.onreadystatechange = function() {
  if (request.readyState === 4 && request.status === 200) {
    requestCallback(JSON.parse(request.responseText));
  }
};

request.open("GET", "{{&endpoint}}{{dataKey}}");
request.send();
```

The callback is fired once the `JSON` is returned, and  will loop through each entry and its children, building a menu navigation system.

```js
// Retrieve the json file with menu data
function requestCallback(data) {
  var parts = KEY.split('/');
  var breadcrumbs = [];

  // Use the menu json to build a tree list
  buildFromSegments(data, breadcrumbs, parts);

  var navTemplate = document.getElementById('nav-template').innerHTML;
  var nav = Handlebars.compile(navTemplate);
  var menuPartial = document.getElementById('menu-partial').innerHTML;
  var menu = Handlebars.compile(menuPartial);

  // Register the partial so it can be used in the nav template
  Handlebars.registerPartial({
    menu: menu
  });

  var navContext = {
    nav: data,
    endpoint: ENDPOINT
  };
  var navHtml = nav(navContext);
  document.getElementById('menu').innerHTML = navHtml;

  // Breadcrumbs
  var headerTemplate = document.getElementById('header-template').innerHTML;
  var header = Handlebars.compile(headerTemplate);
  var headerContext = {
    breadcrumbs: breadcrumbs
  };

  var headerHtml = header(headerContext);
  document.getElementById('header').innerHTML = headerHtml;
};
```