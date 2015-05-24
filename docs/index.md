**DodgerCMS** is a static markdown CMS built on top of [Amazon S3](http://aws.amazon.com/s3/). It is a clean and simple alternative to heavy content management systems. There are no databases to manage, deployments to monitor, or massive configuration files. Just focus on writing your content and the results are live immediately.

The only requirement for DodgerCMS is an account with [Amazon Web Services](http://aws.amazon.com/). It is well suited for small blogs, documentation, and any static website that benefits from the simplicity of markdown. Content is uploaded into the manager and then converted to `HTML` each time the document is updated. DodgerCMS also keeps a data `JSON` file with up to date `URL`'s for each entry that can be used to build a menu system.

## Features

- [Full markdown editor](http://dodgercms.com/features/editor)
  - Simple toolbar and easy file manipulation
  - [Github flavored markdown](https://help.github.com/articles/github-flavored-markdown/) with syntax highlighting
- [Upload images directly to the cloud](http://dodgercms.com/features/images)
  - Upload and insert images directly into your document
- [Handle changes in `url` structure automatically](http://dodgercms.com/features/menu)
  - Changes made to `url`'s are recorded and stored in a `JSON` file you can use to build complex navigation 
- [Access via your S3 bucket](http://dodgercms.com/features/cloud)
  - Turn the manger into a static website and access from anywhere
- [Custom layouts](http://dodgercms.com/features/layouts)
  - The front end design can be altered in any way to suit your specific needs
  - Simple to modify `HTML`, `CSS` and `JS`
- [Live updates](http://dodgercms.com/features/live)
  - Changes to entries take affect immediately
  - No deployments or file uploads necessary

## Screenshots

![dd1.png](http://assets.dodgercms.com.s3.amazonaws.com/images/dd1.png)

![dd2.png](http://assets.dodgercms.com.s3.amazonaws.com/images/dd2.png)

![dd3.png](http://assets.dodgercms.com.s3.amazonaws.com/images/dd3.png)

## FAQ

### How does authentication work?

> A federated token is created from a user with enough credentials to access the buckets in s3. This token renews every `36` hours, if the `access key` and `secret` are stored in local browser storage. For more information see [here](http://dodgercms.com/help/installation#user-account).

### How does the menu work?

> Each time a file gets updated, the menu also updates, keeping all the links up to date. The pages are all static, except for the menu which is loaded as a `JSON` file and then formatted accordingly via JavaScript. For more information see [here](http://dodgercms.com/features/menu).

### Is DodgerCMS right for my project?

> Depends. If you have a lot of markdown content that you need to organize, and don't need any database management then DodgerCMS might be a good fit. If you need search or anything complex than something like CraftCMS might be a better alternative.

### Can I set up SSL?

> Sure, but it needs to be setup with [Amazon CloudFront](http://aws.amazon.com/cloudfront/). There is a good article on how to set that up [here](https://bryce.fisher-fleig.org/blog/setting-up-ssl-on-aws-cloudfront-and-s3/).

### Why did you make this?

> I wanted to see if it was feasible to use S3 as a CMS, and I like working on projects like this for fun.

### Can I change the styles on the front end?

> Absolutely. All the styles and the layout are located in in a single file. For more information see [here](http://dodgercms.com/help/change-layout).

### Does DodgerCMS support any type of search?

> Not at this time. I've been looking into this to see if using AWS Lambda with DynomoDB might be a solution.