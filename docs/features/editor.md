DodgerCMS comes with a fully functional editor, accessible via the cloud or locally on your own file system. It was built to be extremely minimal and stay out of your way. The left pane contains a file browser where you can interact with all of all the entries in your site.

![dd7.png](http://assets.dodgercms.com.s3.amazonaws.com/images/dd7.png)

Easily rename entries of folders, giving them meaningful labels or titles.

![dd16.png](http://assets.dodgercms.com.s3.amazonaws.com/images/dd16.png)

## Toolbar

The toolbar only contains a few items. In the future, more items may be added to the toolbar.

- **Preview**  
  The preview button allows you to easily view the rendered result of your entry. Quickly toggle between `edit` and `preview` mode to get a bird's eye view of the working document.

- **Upload Image**  
  Images can be uploaded directly to your S3 bucket and then inserted directly into your document with a single click. This makes working with images extremely fast and efficient. 

## Syntax Highlighting

DodgerCMS uses [highlight.js](https://highlightjs.org/) for all syntax highlighting, which supports up to 118 languages.

```html
<!DOCTYPE html>
<title>Title</title>

<style>body {width: 500px;}</style>

<script type="application/javascript">
  function $init() {return true;}
</script>

<body>
  <p checked class="title" id="title">Title</p>
  <!-- here goes the rest of the page -->
</body>
```