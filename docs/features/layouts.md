The default layout (what you currently see) can be modified quite simply. The `HTML` is located at https://github.com/ChrisZieba/dodgercms/blob/master/templates/entry.html. This can be modified to use any `CSS` or `JS` library you wish. DodgerCMS used [handlebarsjs](http://handlebarsjs.com/) to render templates for the front end. Handlebars provides the power necessary to let you build semantic templates effectively with no frustration. A portion of the entry template can be seen below.

```
<body>
    <div id="layout">
      <a href="#menu" id="menuLink" class="menu-link">
        <!-- Hamburger icon -->
        <span></span>
      </a>

      <!-- Menu gets loaded dynamically -->
      <nav id="menu"></nav>

      <div id="header" class="header"></div>

      <article id="entry">
        <div class="title">
          <h1>{{title}}</h1>
          <p>Last edited on <span class="last-edited">{{modified}}</span></p>
        </div>

        <!-- The converted markdown content. -->
        <div class="content">{{&body}}</div>
      </article>

      <footer>

      </footer>
    </div>
</body>
```

## Variables

The template is passed a few variables you can use when displaying content.

- `key`  
  The S3 key of the current document, which can be used as a relative link.

- `bucket`   
  The name of the site bucket where the rendered `HTML` is stored.

- `endpoint`  
  The `url` of the site bucket which depends on what region the bucket resides.

- `dataKey`  
  This is the path location in S3 of the `JSON` data file that contains the tree structure of all entries. By default it is set to `.dodgercms/data.json`.

- `title`  
  The title given to the entry in the editor.

- `body`  
  The rendered `HTML` content. 

- `modified`  
  The date string in ISO 8601 format representing the last modified time on the entry. For example, `17/05/2015 22:39:30`.