Feel free to [open issues](https://github.com/ChrisZieba/dodgercms/issues) and send pull requests on GitHub! When sending a pull request, please create a new topic/feature branch, and send your pull request from that branch. Please do *not* send pull requests from your `master` branch because this tends to lead to merge conflicts.

## Building

DodgerCMS uses [Grunt](http://gruntjs.com/), a JavaScript task runner that runs on [Node.js](https://nodejs.org/), for building and testing. You'll need Node.js and Grunt installed to work on DodgerCMS. Once installed, clone the `dodgermcs` repo (either the main repo or your fork) and install the plugins via npm:

```shell
$ git clone git://github.com/ChrisZieba/dodgercms.git
$ cd dodgercms/
$ npm install
```

Building DodgerCMS is easy, run `grunt`:

```shell
$ grunt
```

**Note:** To save your fingers from The Developer Konami Code: ⌘⇥ ↑ ⏎ run the `grunt watch` task with will continuously test and build DodgerCMS anytime a file changes:

```shell
$ grunt watch
```

## Testing

Before sending pull requests, please ensure that you open the test HTML files in these environments. If you don't have access to all these environments, list the ones that you have tested in on the pull request description. That way, we know what's missing, and can help you out.

[Grunt]: http://gruntjs.com/
[Node.js]: http://nodejs.org/

## Style Guide

DodgerCMS has adopted the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) for writing JavaScript.