The default theme will look for the logo in your site bucket. The dimensions should be `350` by `75` if you use the default theme, to avoid any disproportionate views. The [entry template](https://github.com/ChrisZieba/dodgercms/blob/master/templates/entry.html) can be modified directly to load a resource from any `uri` you choose. The relevant code snippet from the template uses the `endpoint` variable to locate the image from your site bucket.

```html
<a class="pure-menu-heading" href="/">
   <img src="{{&endpoint}}.dodgercms/logo.png">
</a>
```

When rendered this will product the following `HTML`.

```html
<a class="pure-menu-heading" href="/">
   <img src="http://dodgercms.com.s3-website-us-east-1.amazonaws.com/.dodgercms/logo.png">
</a>
```

If you add an image to the location `.dodgercms/logo.png` in your site bucket, it will be used as the main logo on the front end site.