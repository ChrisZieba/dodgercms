The [entry template](https://github.com/ChrisZieba/dodgercms/blob/master/templates/entry.html) can be modified to use any layout you wish. The default uses [purecss](http://purecss.io/) for the layout structure, but you could easily use [bootstrap](http://getbootstrap.com/) or any other library. The main body content is very simple by design. 

```html
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
  </div>
</body>
```

## Build

Once you have edited the template it must be compiled by running `grunt`:

```shell
$ grunt
```

Now when you edit and save entries the new template with your layout will be used.