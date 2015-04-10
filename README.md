![DodgerCMS](http://i.imgur.com/EmVj8OL.png)

A simple CMS using AWS Lambda, S3 and react.js. Markdown files are converted to HTML.

Policy for 

# Installation

You will need three buckets in s3 for this application

- one for storing the markdown files
- another for the generated html files (this will be the static website end users will be visiting)
- a bucket for the admin manager
- a fourth (optional) bucket for redirecting `www`