/**
 * Collection of utility functions used in application.
 *
 * This source code is licensed under the MIT-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Author: Chris Zieba (zieba.chris@gmail.com)
*/

var dodgercms = dodgercms || {};

dodgercms.utils = (function() {
  'use strict';

  /**
   * Returns the possible folders based on the list of S3 keys.
   *
   * @param {Array} Keys from S3
   * @return {Array}
  */
  function getFolders(objects) {
    // Default to the root folder
    var folders = ['/'];

    // Loop through each object in the list
    for (var i = 0; i < objects.length; i+=1) {
      var key = objects[i].Key;

      // Split and remove last slash for directory
      var parts = key.replace(/\/\s*$/, '').split('/');

      for (var j = 0; j < parts.length; j+=1) {
        var isFolder = false;

        // If the last part in the key has a trailing slash or if the part 
        // is in not the last elemenet it is a path, it is a folder
        if ((j === parts.length-1 && key.substr(-1) === '/') || j !== parts.length-1) {
          isFolder = true;
        }

        if (isFolder) {
          var folder = parts.slice(0, j+1).join('/') + '/';
          // Push only if unique
          if ($.inArray(folder, folders) < 0) {
            folders.push(folder);
          }
        }
      }
    }

    return folders;
  }

  /**
   * Creates a new folder in S3.
   *
   * @param {String} key The new key to place in S3
   * @param {String} dataBucket The bucket where the markdown resides
   * @param {String} siteBucket The front end website bucket
   * @param {Function} callback
  */
  function newFolder(key, dataBucket, siteBucket, callback) {
    dodgercms.s3.putObject(key, dataBucket, function(err, data) {
      if (err) {
        callback(err);
      } else {
        dodgercms.s3.putObject(key, siteBucket, function(err, data) {
          if (err) {
            callback(err);
          } else {
            // Check if a callback was supplied
            if (typeof callback !== 'undefined') {
              callback(null, key);
            }
          }
        });
      }
    });
  }

  /**
   * Checks if a given key is a folder.
   *
   * @param {String} key The key name
   * @return {Boolean}
  */
  function isFolder(key) {
    return (key.substr(-1) === '/') ? true : false;
  }

  /**
   * Returns the last part (file name) in the file path.
   *
   * @param {String} key The key name
   * @return {String} A new jsTree node 
  */
  function getSlug(key) {
    var parts = key.split('/');
    return parts.pop();
  }

  return {
    newFolder: newFolder,
    isFolder: isFolder,
    getSlug: getSlug,
    getFolders: getFolders
  };
}());