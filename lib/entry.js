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

    // when an entry gets renamed
    function rename(source, target, folderChange, dataBucket, siteBucket, callback) {
        dodgercms.s3.renameObjects(source, target, folderChange, dataBucket, function(err, data) {
            if (err) {
                // TODO
                callback(err);
            } else {
                dodgercms.s3.renameObjects(source, target, folderChange, siteBucket, function(err, data) {
                    if (err) {
                        // TODO
                        callback(err);
                    } else {
                        // removes from both buckets
                        dodgercms.entry.remove(source, dataBucket, siteBucket, callback);
                    }
                });
            }
        });
    }

    function upsert(key, title, content, bucket, endpoint, s3, callback) {

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
                var params = {
                    Bucket: bucket,
                    Key: key,
                    Body: html,
                    ContentType: "text/html; charset=UTF-8",
                    Expires: 0,
                    CacheControl: "public, max-age=0, no-cache",
                    Metadata: {
                        "title": title
                    }
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
                menu(bucket, endpoint, callback);
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
            // filter unwanted files
            function(data, waterfallCb) {
                var contents = data.Contents;
                for (var i = contents.length -1; i >= 0 ; i-=1) {
                    // keys beginning with a period are treated as hidden or system files
                    if (contents[i].Key.substr(0, 1) === '.') {
                        contents.splice(i, 1);
                    }
                }

                waterfallCb(null, contents);
            },
            // takes the files from the s3 bucket
            function(data, waterfallCb) {
                var keys = [];

                // get each object in parallel
                async.each(data, function(object, cb) {
                  // Perform operation on file here.
                    dodgercms.s3.headObject(object.Key, bucket, function(err, objectData) {
                        if (err) {
                            cb(err);
                        } else {
                            // add the Key attribute
                            objectData.Key = object.Key
                            keys.push(objectData);
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

                function buildFromSegments(scope, keyParts, pathSegments, isFolder, keyLabel) {
                    // Remove the first segment from the path
                    var current = pathSegments.shift();

                    // Keep track of the key, which is the link to the attribute
                    keyParts.push(current);

                    // The label defaults to the current part if no other title or folder label is added
                    var label = current;

                    // See if that segment already exists in the current scope
                    var found = findInScope(scope, current);

                    // If we did not find a match, create the new object for this path segment
                    if (!found) {
                        var key = keyParts.join('/');

                        // Check if the last part in the path segment
                        if (!pathSegments.length) {
                            // if the key is a folder we need to add a trailing slash
                            if (isFolder) {
                                key += '/';
                            }

                            if (keyLabel) {
                                label = keyLabel;
                            }
                        } else {
                            // If there are more parts then the key must be a folder
                            key += '/';
                        }

                        found = {
                            key: key,
                            part: current,
                            index: (!pathSegments.length && current === 'index') ? true : false,
                            label: label,
                            children: false
                        };

                        scope.push(found);
                    }

                    // If there are still path segments left, we need to create
                    // a children array (if we haven't already) and recurse further
                    if (pathSegments.length) {
                        found.children = found.children || [];
                        buildFromSegments(found.children, keyParts, pathSegments, isFolder, keyLabel);
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

                keys.forEach(function(object) {
                    var key = object.Key;
                    // if it ends with a slash its a directory
                    var isFolder = (key.substr(-1) === '/') ? true : false;
                    var label = (isFolder) ? object.Metadata["label"] : object.Metadata["title"];

                    // remove the last slash if is exists so there is no empty string in the split array
                    var parts = object.Key.replace(/\/\s*$/, "").split('/');

                    buildFromSegments(tree, [], parts, isFolder, label);
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

                var params = {
                    Bucket: bucket,
                    Key: ".dodgercms/nav.html",
                    Body: nav,
                    ContentType: "text/html; charset=UTF-8",
                    Expires: 0,
                    CacheControl: "public, max-age=0, no-cache"
                };
                dodgercms.s3.upload(params, function(err, data) {
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
                callback(null)
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