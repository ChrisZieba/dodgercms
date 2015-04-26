/**

 */

var dodgercms = dodgercms || {};

dodgercms.entry = (function() {
    'use strict';

    // when an entry gets deleted
    function remove(key, dataBucket, siteBucket, callback) {
        dodgercms.s3.deleteObjects(key, dataBucket, function(err, data) {
            if (err) {
                // TODO
                callback(err);
            } else {
                dodgercms.s3.deleteObjects(key, siteBucket, function(err, data) {
                    if (err) {
                        // TODO
                        callback(err);
                    } else {
                        callback(null, data);
                    }
                });
            }
        });
    }

    // when an entry gets deleted
    function rename(source, target, dataBucket, siteBucket, callback) {
        dodgercms.s3.renameObjects(source, target, dataBucket, function(err, data) {
            if (err) {
                // TODO
                callback(err);
            } else {
                dodgercms.s3.renameObjects(source, target, siteBucket, function(err, data) {
                    if (err) {
                        // TODO
                        callback(err);
                    } else {
                        // remove
                        dodgercms.entry.remove(source, dataBucket, siteBucket, callback);
                    }
                });
            }
        });
    }

    function upsert(key, bucket, content, endpoint, s3, callback) {

        async.waterfall([
            function(waterfallCb) {
                var options = {
                    renderer: new marked.Renderer(),
                    gfm: true,
                    tables: true,
                    breaks: false,
                    pedantic: false,
                    sanitize: true,
                    smartLists: true,
                    smartypants: true,
                    highlight: function(code) {
                        return hljs.highlightAuto(code).value;
                    }
                };

                marked(content, options, function(err, data) {
                    if (err) {
                        waterfallCb(err);
                    } else {
                        waterfallCb(null, data);
                    }
                })
                
            },
            // Process the templates
            function(body, waterfallCb) {

                var context = {
                    body: body,
                    bucket: bucket,
                    endpoint: endpoint
                };
                //console.log(Handlebars.templates);
                var entry = dodgercms.templates["entry.html"];
                var html = entry(context);

                waterfallCb(null, html);
            },
            function(html, waterfallCb) {
                var metadata = {
                    "Content-Type": "text/html; charset=UTF-8"
                };

                var params = {
                    Bucket: bucket,
                    Key: key,
                    Body: html,
                    ContentType: "text/html; charset=UTF-8",
                    Expires: 0,
                    CacheControl: "public, max-age=0, no-cache"
                };
                s3.upload(params, function(err, data) {
                    if (err) {
                        waterfallCb(err);
                    } else {
                        console.log('upload successful');
                        waterfallCb(null);
                    }
                });
            },
            // The navigatio needs to be updated
            function(waterfallCb) {
                // get the .menu file

                // get all the objects in the bucket
                var params = {
                    Bucket: bucket,
                    EncodingType: 'url',
                    MaxKeys: 1000,
                };

                s3.listObjects(params, function(err, data) {
                    if (err) {
                        waterfallCb(err);
                    } else {
                        waterfallCb(null, data);
                    }
                });


            },

            // takes the files from the s3 bucket
            function(data, waterfallCb) {

                var contents = data.Contents;
                var keys = [];

                // get each object in parallel
                async.each(contents, function(object, cb) {
                  // Perform operation on file here.
                    s3.headObject({
                        Bucket: bucket, 
                        Key: object.Key
                    }, function(err, data) {
                        if (err) {
                            cb(err);
                        } else {
                            // add the Key attribute
                            data.Key = object.Key
                            keys.push(data);
                            cb(null);
                        }
                    });

                }, function(err) {
                    // if any of the file processing produced an error
                    if (err) {
                        waterfallCb(err);
                    } else {
                        waterfallCb(null, keys);
                    }
                });



            },

            // takes an array of keys and builds a tree
            // ["key-name"]: {data}
            function(keys, waterfallCb) {
                var tree = [];


                function buildFromSegments(scope, pathSegments) {
                    // Remove the first segment from the path
                    var current = pathSegments.shift();

                    // See if that segment already exists in the current scope
                    var found = findInScope(scope, current);

                    // If we did not find a match, create the new object for this path segment
                    if (!found) {
                        scope.push(found = {
                            label: current,
                            children: false
                        });
                    }

                    // If there are still path segments left, we need to create
                    // a children array (if we haven't already) and recurse further
                    if (pathSegments.length) {
                        found.children = found.children || [];
                        buildFromSegments(found.children, pathSegments);
                    }
                }

                // Attempts to find a path segment in the current scope
                function findInScope(scope, find) {
                    for (var i = 0; i < scope.length; i++) {
                        if (scope[i].label === find) {
                            return scope[i];
                        }
                    }
                }

                keys.forEach(function(data) {
                    var key = data.Key;

                    // if it ends with a slash its a directory
                    //var isDir = (key.substr(-1) === '/') ? true : false;
                    // remove the last slash if is exists so there is no empty string in the split array
                    var parts = data.Key.replace(/\/\s*$/, "").split('/');

                    buildFromSegments(tree, parts);
                });


                var context = {
                    nav: tree,
                    bucket: bucket,
                    endpoint: endpoint
                };

                //var menu = dodgercms["templates/menu.html"];
                var nav = dodgercms.templates["nav.html"];

                var html = nav(context);
                waterfallCb(null, html);
            },

            // upload the nav to the bucket
            function(nav, waterfallCb) {
                var metadata = {
                    "Content-Type": "text/html"
                };

                var params = {
                    Bucket: bucket,
                    Key: ".dodgercms/nav.html",
                    Body: nav,
                    ContentType: "text/html; charset=UTF-8",
                    Expires: 0,
                    CacheControl: "public, max-age=0, no-cache"
                };
                s3.upload(params, function(err, data) {
                    if (err) {
                        waterfallCb(err);
                    } else {
                        console.log('upload successful');
                        waterfallCb(null);
                    }
                });
            }
        ], function(err, result) {
            if (err) {
                console.log(err);
            } else {
                callback()
            } 
        });
    }

    function menu(bucket, endpoint, callback) {
        async.waterfall([
            // The navigatio needs to be updated
            function(waterfallCb) {
                dodgercms.s3.listObjects(null, bucket, function(err, data) {
                    if (err) {
                        waterfallCb(err);
                    } else {
                        waterfallCb(null, data);
                    }
                });
            },

            // takes the files from the s3 bucket
            function(data, waterfallCb) {

                var contents = data.Contents;
                var keys = [];

                // get each object in parallel
                async.each(contents, function(object, cb) {
                  // Perform operation on file here.
                    dodgercms.s3.headObject(object.Key, bucket, function(err, data) {
                        if (err) {
                            cb(err);
                        } else {
                            // add the Key attribute
                            data.Key = object.Key
                            keys.push(data);
                            cb(null);
                        }
                    });

                }, function(err) {
                    // if any of the file processing produced an error
                    if (err) {
                        waterfallCb(err);
                    } else {
                        waterfallCb(null, keys);
                    }
                });
            },

            // takes an array of keys and builds a tree
            // ["key-name"]: {data}
            function(keys, waterfallCb) {
                var tree = [];

                function buildFromSegments(scope, pathSegments) {
                    // Remove the first segment from the path
                    var current = pathSegments.shift();

                    // See if that segment already exists in the current scope
                    var found = findInScope(scope, current);

                    // If we did not find a match, create the new object for this path segment
                    if (!found) {
                        scope.push(found = {
                            label: current,
                            children: false
                        });
                    }

                    // If there are still path segments left, we need to create
                    // a children array (if we haven't already) and recurse further
                    if (pathSegments.length) {
                        found.children = found.children || [];
                        buildFromSegments(found.children, pathSegments);
                    }
                }

                // Attempts to find a path segment in the current scope
                function findInScope(scope, find) {
                    for (var i = 0; i < scope.length; i++) {
                        if (scope[i].label === find) {
                            return scope[i];
                        }
                    }
                }

                keys.forEach(function(data) {
                    var key = data.Key;

                    // if it ends with a slash its a directory
                    //var isDir = (key.substr(-1) === '/') ? true : false;
                    // remove the last slash if is exists so there is no empty string in the split array
                    var parts = data.Key.replace(/\/\s*$/, "").split('/');

                    buildFromSegments(tree, parts);
                });


                var context = {
                    nav: tree,
                    bucket: bucket,
                    endpoint: endpoint
                };

                //var menu = dodgercms["templates/menu.html"];
                var nav = dodgercms.templates["nav.html"];

                var html = nav(context);
                waterfallCb(null, html);
            },

            // upload the nav to the bucket
            function(nav, waterfallCb) {
                var metadata = {
                    "Content-Type": "text/html"
                };

                var params = {
                    Bucket: bucket,
                    Key: ".dodgercms/nav.html",
                    Body: nav,
                    ContentType: "text/html; charset=UTF-8",
                    Expires: 0,
                    CacheControl: "public, max-age=0, no-cache"
                };
                s3.upload(params, function(err, data) {
                    if (err) {
                        waterfallCb(err);
                    } else {
                        console.log('upload successful');
                        waterfallCb(null);
                    }
                });
            }
        ], function(err, result) {
            if (err) {
                console.log(err);
            } else {
                callback()
            } 
        });
    }

    return {
        upsert: upsert,
        remove: remove,
        rename: rename,
        menu: menu
    };
}());