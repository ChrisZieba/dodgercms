/**
 * Collection of utility functions.
 *
 * This source code is licensed under the MIT-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Author: Chris Zieba (zieba.chris@gmail.com)
*/

var dodgercms = dodgercms || {};

dodgercms.utils = (function() {
  'use strict';

  function getFolders(objects) {
    var folders = ['/'];

    // Loop through each object
    for (var i = 0; i < objects.length; i+=1) {
      var key = objects[i].Key;

      // split and remove last slash for directory
      var parts = key.replace(/\/\s*$/, '').split('/');

      for (var j = 0; j < parts.length; j+=1) {
        var isFolder = false;

        // if the last part in the key has a trailing slash or if the part 
        // is in not the last elemenet it is a path
        if ((j === parts.length-1 && key.substr(-1) === '/') || j !== parts.length-1) {
          isFolder = true;
        }

        if (isFolder) {
          var folder = parts.slice(0, j+1).join('/') + '/';
          // push if unique
          if ($.inArray(folder, folders) < 0) {
            folders.push(folder);
          }
        }
      }
    }

    return folders;
  }

  function newFolder(key, dataBucket, siteBucket, callback) {
    dodgercms.s3.putObject(key, dataBucket, function(err, data) {
      if (err) {
        callback(err);
      } else {
        dodgercms.s3.putObject(key, siteBucket, function(err, data) {
          if (err) {
            callback(err);
          } else {
            if (typeof callback !== 'undefined') {
              callback(null, key);
            }
          }
        });
      }
    });
  }

  return {
    newFolder: newFolder,
    getFolders: getFolders
  };
}());