/**
 * Library for working with a markdown entry.
 *
 * This source code is licensed under the MIT-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Author: Chris Zieba (zieba.chris@gmail.com)
*/

var dodgercms = dodgercms || {};

dodgercms.entry = (function() {
  'use strict';

  var DATA_KEY = '.dodgercms/data.json';

  /**
   * When an entry gets deleted.
   *
   * @param {String} key Access key
   * @param {String} dataBucket Bucket where the markdown files are
   * @param {String} siteBucket Bucket for the front end website
   * @param {Function} callback Callback function
  */
  function remove(key, dataBucket, siteBucket, callback) {
    dodgercms.s3.deleteObjects(key, dataBucket, function(err, data) {
      if (err) {
        callback(err);
      } else {
        dodgercms.s3.deleteObjects(key, siteBucket, function(err, data) {
          if (err) {
            callback(err);
          } else {
            callback(null, data);
          }
        });
      }
    });
  }

  /**
   * When an entry gets renamed.
   *
   * @param {String} source The original location of the key
   * @param {String} target The new location of the key
   * @param {String} dataBucket Bucket where the markdown files are
   * @param {String} siteBucket Bucket for the front end website
   * @param {Function} callback Callback function
  */
  function rename(source, target, dataBucket, siteBucket, callback) {
    dodgercms.s3.renameObjects(source, target, dataBucket, function(err, data) {
      if (err) {
        callback(err);
      } else {
        dodgercms.s3.renameObjects(source, target, siteBucket, function(err, data) {
          if (err) {
            callback(err);
          } else {
            // Removes from both buckets
            remove(source, dataBucket, siteBucket, callback);
          }
        });
      }
    });
  }

  /**
   * Creates a new entry if it does not exist, or updates an existing entry.
   *
   * @param {String} key The key name
   * @param {String} metadata The metadata of the entry
   * @param {String} content The markdown content
   * @param {String} bucket The front end bucket
   * @param {String} endpoint The endpoint for the bucket
   * @param {Function} callback Callback function
  */
  function upsert(key, metadata, content, bucket, endpoint, callback) {
    async.waterfall([
      function(waterfallCb) {
        var options = {
          renderer: new marked.Renderer(),
          gfm: true,
          tables: true,
          breaks: false,
          pedantic: false,
          sanitize: false, //default is true
          smartLists: true,
          smartypants: false,
          highlight: function(code) {
            return hljs.highlightAuto(code).value;
          }
        };

        // Convert the content to HTML
        marked(content, options, function(err, data) {
          if (err) {
            waterfallCb(err);
          } else {
            waterfallCb(null, data);
          }
        });
      },
      // Process the templates
      function(body, waterfallCb) {
        var modified = new Date();
        var context = {
          key: key,
          title: metadata.title,
          modified: modified.toLocaleString(),
          body: body,
          bucket: bucket,
          endpoint: endpoint,
          dataKey: DATA_KEY
        };

        var entry;
        if(metadata.template){
          entry = dodgercms.templates[metadata.template.toString()];
        }
        else {
          entry = dodgercms.templates['entry.html'];
        }
        var html = entry(context);

        waterfallCb(null, html);
      },
      // Upload the key to S3
      function(html, waterfallCb) {
        var params = {
          Bucket: bucket,
          Key: key,
          Body: html,
          ContentType: 'text/html; charset=UTF-8',
          Expires: 0,
          CacheControl: 'public, max-age=0, no-cache',
          Metadata: metadata
        };

        if(!metadata.visibility || (metadata.visibility == 'visible') ){
          dodgercms.s3.upload(params, function(err, data) {
            if (err) {
              waterfallCb(err);
            } else {
              waterfallCb(null);
            }
          });
        }
        else {
          //only remove the html file from site bucket
          dodgercms.s3.deleteObjects(params.Key, params.Bucket, function(err, data) {
            if (err) {
              waterfallCb(err);
            } else {
              waterfallCb(null);
            }
          });
        }
      }
    ],
    // Callback
    function(err, result) {
      if (err) {
        callback(err);
      } else {
        callback(null, result);
      }
    });
  }

  /**
   * Generates the menu data.
   *
   * @param {String} bucket The front end bucket
   * @param {String} endpoint The endpoint for the bucket
   * @param {Function} callback Callback function
  */
  function menu(bucket, endpoint, callback) {
    async.waterfall([
      // The navigation needs to be updated
      function(waterfallCb) {
        dodgercms.s3.listObjects(null, bucket, function(err, data) {
          if (err) {
            waterfallCb(err);
          } else {
            waterfallCb(null, data);
          }
        });
      },
      // Filter unwanted files
      function(data, waterfallCb) {
        var contents = data.Contents;
        for (var i = contents.length -1; i >= 0 ; i-=1) {
          // Keys beginning with a period are treated as hidden or system files
          if (contents[i].Key.substr(0, 1) === '.') {
            contents.splice(i, 1);
          }
        }

        waterfallCb(null, contents);
      },
      // Takes the files from the s3 bucket
      function(data, waterfallCb) {
        var keys = [];

        // Get each object in parallel
        async.each(data, function(object, cb) {
          dodgercms.s3.headObject(object.Key, bucket, function(err, objectData) {
            if (err) {
              cb(err);
            } else {
              // Add the Key attribute
              objectData.Key = object.Key;
              keys.push(objectData);
              cb(null);
            }
          });

        },
        function(err) {
          if (err) {
            waterfallCb(err);
          } else {
            waterfallCb(null, keys);
          }
        });
      },
      // Takes an array of keys and builds a tree
      function(keys, waterfallCb) {
        //sort the keys
        keys = _.sortBy(keys, function(item){
          if(item.Metadata.title){
            return item.Metadata.title.toString();
          }
          else {
            return item.Key.toString();
          }
        });
        var tree = [];

        // A reference to the parentScope is needed so we can add the index if needed
        function buildFromSegments(scope, parentScope, keyParts, pathSegments, isFolder, keyLabel) {
          // Remove the first segment from the path
          var current = pathSegments.shift();

          // Keep track of the key, which is the link to the entry
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
              // If the key is a folder we need to add a trailing slash
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
              // The link is filled in later if the folder contains an index
              link: (isFolder) ? null : key,
              label: label,
              children: false
            };

            // Add the link in for folders which have an index file
            if (parentScope && current === 'index') {
              parentScope.link = parentScope.key;
            }

            scope.push(found);
          } else {
            // The label needs to be applied if not already
            if (!pathSegments.length && isFolder && keyLabel) {
              found.label = keyLabel;
            }
          }

          // If there are still path segments left, we need to create
          // a children array (if we haven't already) and recurse further
          if (pathSegments.length) {
            found.children = found.children || [];
            buildFromSegments(found.children, found, keyParts, pathSegments, isFolder, keyLabel);
          }
        }

        // Attempts to find a path segment in the current scope
        function findInScope(scope, find) {
          for (var i = 0; i < scope.length; i++) {
            if (scope[i].part === find) {
              return scope[i];
            }
          }
        }

        keys.forEach(function(object) {
          var key = object.Key;

          // If it ends with a slash it's a directory
          var isFolder = (key.substr(-1) === '/') ? true : false;
          var label = (isFolder) ? object.Metadata.label : object.Metadata.title;

          // Remove the last slash if is exists so there is no empty string in the split array
          var parts = object.Key.replace(/\/\s*$/, '').split('/');

          buildFromSegments(tree, null, [], parts, isFolder, label);
        });

        waterfallCb(null, tree);
      },
      // Upload the nav to the bucket
      function(data, waterfallCb) {
        //sort the menu
        data = _.sortBy(data, function(item){
          return item.label.toString();
        });

        var params = {
          Bucket: bucket,
          Key: DATA_KEY,
          Body: JSON.stringify(data),
          ContentType: 'application/json; charset=UTF-8',
          Expires: 0,
          CacheControl: 'public, max-age=0, no-cache'
        };
        dodgercms.s3.upload(params, function(err, data) {
          if (err) {
            waterfallCb(err);
          } else {
            waterfallCb(null, data);
          }
        });
      }
    ],
    function(err, result) {
      if (err) {
        callback(err);
      } else {
        callback(null, result);
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
