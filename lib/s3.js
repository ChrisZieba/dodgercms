/**
 * Wrapper around the AWS SDK functions.
 *
 * This source code is licensed under the MIT-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Author: Chris Zieba (zieba.chris@gmail.com)
*/

var dodgercms = dodgercms || {};

dodgercms.s3 = (function() {
  'use strict';

  var ENCODING_TYPE = 'url';
  var API_VERSION = '2011-06-15';

  var s3 = null;

  /**
   * Initialize the connection object to S3.
   *
   * @param {String} accessKeyId Access key
   * @param {String} secretAccessKey Secret access key
   * @param {String} sessionToken The session token for the federated user
   * @param {Boolean} force Create a new S3 object if one exists already
   * @return {Object}
  */
  function init(accessKeyId, secretAccessKey, sessionToken, force) {

    if (!accessKeyId || !secretAccessKey || !sessionToken) {
      throw new Error('Missing arguments');
    }

    if (!s3 || force) {
      s3 = new AWS.S3({
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
        sessionToken: sessionToken,
        sslEnabled: true,
        // Duration of 36 hours
        DurationSeconds: 129600,
        apiVersion: API_VERSION,
        maxRetries: 1
      });
    }

    return s3;
  }

  /**
   * Returns the API version used by the AWS SDK.
   *
   * @return {String}
  */
  function getApiVersion() {
    return API_VERSION;
  }

  /**
   * Rename an object in S3.
   *
   * @param {String} source The current name of the key
   * @param {String} target The new name of the key
   * @param {String} bucket Where the key resides
   * @param {Function} callback Callback function
  */
  function renameObject(source, target, bucket, callback) {
    var params = {
      Bucket: bucket,
      MetadataDirective: 'COPY',
      // Copy Source must mention the source bucket and key: sourcebucket/sourcekey
      CopySource: bucket + '/' + source,
      Key: target
    };

    // Copy the key to a new location
    s3.copyObject(params, function(err, data) {
      if (err) {
        callback(err);
      } else {
        deleteObject(source, bucket, callback);
      }
    });
  }

  /**
   * Upload an object to S3.
   *
   * @param {Object} params Parameters
   * @param {Function} callback Callback function
  */
  function upload(params, callback) {
    if(sessionStorage.s3data){
      sessionStorage.removeItem('s3data');
    }
    if(sessionStorage.s3meta){
      sessionStorage.removeItem('s3meta');
    }
    s3.upload(params, function(err, data) {
      if (err) {
        callback(err);
      } else {
        callback(null, data);
      }
    });
  }

  /**
   * Get an object from S3.
   *
   * @param {String} key The key name
   * @param {String} bucket The bucket where the key resides
   * @param {Function} callback Callback function
  */
  function getObject(key, bucket, callback) {
    var params = {
      Bucket: bucket,
      Key: key
    };
    if(sessionStorage.s3data){
      var data = JSON.parse(sessionStorage.s3data);
      var item = _.findWhere(data.Contents, {Key: key});


      if(sessionStorage.getItem(item.ETag+'_'+key)){
        console.log('getObject', 'local');
        var localItem = JSON.parse(sessionStorage.getItem(item.ETag+'_'+key));
        localItem.Body = JSON.parse(sessionStorage.getItem(item.ETag+'_'+key+'-Body'));
        callback(null, localItem);
        return;
      }
    }

    s3.getObject(params, function(err, data) {
      if (err) {
        callback(err);
      } else {
        console.log('getObject', 'remote');
        sessionStorage.setItem(data.ETag+'_'+key, JSON.stringify(data));
        sessionStorage.setItem(data.ETag+'_'+key+'-Body', JSON.stringify(data.Body.toString()));
        callback(null, data);
      }
    });
  }

  /**
   * Get meta information for a key in S3.
   *
   * @param {String} key The key name
   * @param {String} bucket The bucket where the key resides
   * @param {Function} callback Callback function
  */
  function headObject(key, bucket, callback) {
    var params = {
      Bucket: bucket,
      Key: key
    };

    s3.headObject(params, function(err, data) {
      if (err) {
        callback(err);
      } else {
        callback(null, data);
      }
    });
  }

  /**
   * Upload a key to an S3 bucket.
   *
   * @param {String} key The key name
   * @param {String} bucket The bucket where the key resides
   * @param {Function} callback Callback function
  */
  function putObject(key, bucket, callback) {
    var params;

    // If there are two arguments and the first is an object we we given the params directly
    if (arguments.length === 2 && typeof key === 'object') {
      params = key;
      callback = bucket;
    } else {
      params = {
        Bucket: bucket,
        Key: key
      };
    }

    s3.putObject(params, function(err, data) {
      if (err) {
        callback(err);
      } else {
        callback(null, data);
      }
    });
  }

  /**
   * Delete a key in S3.
   *
   * @param {String} key The key name
   * @param {String} bucket The bucket where the key resides
   * @param {Function} callback Callback function
  */
  function deleteObject(key, bucket, callback) {
    var params = {
      Bucket: bucket,
      Key: key
    };

    s3.deleteObject(params, function(err, data) {
      // Do not throw an error if the key does not exist
      if (err && err.code !== 'NoSuckKey') {
        callback(err);
      } else {
        callback(null, data);

      }
    });
  }

  /**
   * Copy a key from one location to another.
   *
   * @param {String} source The original location of the key
   * @param {String} target Where to move the key to
   * @param {String} bucket The bucket where the key resides
   * @param {Function} callback Callback function
  */
  function copyObject(source, target, bucket, callback) {
    var params = {
      Bucket: bucket,
      MetadataDirective: 'COPY',
      // Copy Source must mention the source bucket and key: sourcebucket/sourcekey
      CopySource: bucket + '/' + source,
      Key: target
    };

    s3.copyObject(params, function(err, data) {
      if (err) {
        callback(err);
      } else {
        callback(null, data);

      }
    });
  }

  /**
   * Rename multiple objects from one location to another.
   *
   * @param {String} source The original location of the key
   * @param {String} target Where to move the key to
   * @param {String} bucket The bucket where the key resides
   * @param {Function} callback Callback function
  */
  function renameObjects(source, target, bucket, callback) {
    // If the key is a folder we want to copy each child
    if (source.substr(-1) === '/') {
      // Split the file path into an array of parts
      var parts = source.replace(/\/\s*$/, '').split('/');

      // Remove the last part off the file path
      parts.splice(-1, 1, target);

      // The key to replace the old directory
      var targetPrefix = parts.join('/') + '/';
      console.log('s3.js 269', source, targetPrefix);

      //remove the local session storage instance of the data list. this ensures we are totally synced.
      if(sessionStorage.s3data){
        sessionStorage.removeItem('s3data');
      }
      if(sessionStorage.s3meta){
        sessionStorage.removeItem('s3meta');
      }

      listObjects(source, bucket, function(err, data) {
        if (err) {
          callback(err);
        } else {
          var contents = data.Contents;

          // Copy each object in parallel
          async.each(contents, function(object, cb) {
            // Replace the source with the target
            var key = targetPrefix + object.Key.substr(source.length);

            dodgercms.s3.copyObject(object.Key, key, bucket, cb);
          }, function(err) {
            if (err) {
              callback(err);
            } else {
              // Remove all the files from the site bucket
              callback(null);
            }
          });
        }
      });
    } else {
      dodgercms.s3.copyObject(source, target, bucket, callback);
    }
  }

  /**
   * Delete multiple keys in S3.
   *
   * @param {String} key The key name
   * @param {String} bucket The bucket where the key resides
   * @param {Function} callback Callback function
  */
  function deleteObjects(key, bucket, callback) {
    // If the key is a folder we want to delete all keys inside the folder, as well so we
    // use the key name as a prefix but if its a file, no prefix will delete only the one item
    if (key.substr(-1) === '/') {
      listObjects(key, bucket, function(err, data) {
        if (err) {
          callback(err);
        } else {
          var contents = data.Contents;
          // Delete each object in parallel
          async.each(contents, function(object, cb) {
            dodgercms.s3.deleteObject(object.Key, bucket, cb);
          }, function(err) {
            if (err) {
              callback(err);
            } else {
              // Remove all the files from the site bucket
              callback(null);
            }
          });
        }
      });
    } else {
      // Just delete the one key
      dodgercms.s3.deleteObject(key, bucket, callback);
    }
  }

  /**
   * Get a list of all objects in an S3 bucket.
   *
   * @param {String} prefix Optional prefix used when searching for keys
   * @param {String} bucket The bucket to query objects from
   * @param {Function} callback Callback function
  */
  function listObjects(prefix, bucket, callback) {
    // The prefix is an optional argument
    if (arguments.length === 2) {
      callback = bucket;
      bucket = prefix;
      prefix = '';
    }

    var params = {
      Bucket: bucket,
      EncodingType: ENCODING_TYPE,
      MaxKeys: 1000,
      Prefix: prefix
    };

  /*  if(sessionStorage.s3data){
      console.log('listObjects', 'local');
      callback(null, JSON.parse(sessionStorage.s3data));
    }
    else { */
      s3.listObjects(params, function(err, data) {
        if (err) {
          callback(err);
        } else {
          console.log('listObjects', 'remote');
          sessionStorage.setItem('s3data', JSON.stringify(data));
          callback(null, data);
        }
      });
    //}
  }

  /**
   * Gets meta data for multiple objects. Need to make a head
   * request for each key. Useful after getting a list of objects.
   *
   * @param {Array} contents A list of keys to query
   * @param {String} bucket The bucket where the keys reside
   * @param {Function} callback Callback function
  */
  function headObjects(contents, bucket, callback) {
    var keys = [];

    // Get each object in parallel
  /*  if(sessionStorage.s3meta){
      console.log('listHeadObjects', 'local');
      callback(null, JSON.parse(sessionStorage.s3meta));
    }
    else { */
      console.log('listHeadObjects', 'remote');
      async.each(contents, function(object, cb) {
        s3.headObject({
          Bucket: bucket,
          Key: object.Key
        }, function(err, data) {
          if (err) {
            cb(err);
          } else {
            // Add the key attribute
            data.Key = object.Key;
            keys.push(data);
            cb(null);
          }
        });
      },
      function(err) {
        if (err) {
          callback(err);
        } else {
          sessionStorage.setItem('s3meta', JSON.stringify(keys));
          callback(null, keys);
        }
      });
    //}
  }
  return {
    init: init,
    getApiVersion: getApiVersion,
    getObject: getObject,
    upload: upload,
    headObject: headObject,
    putObject: putObject,
    copyObject: copyObject,
    deleteObject: deleteObject,
    deleteObjects: deleteObjects,
    renameObject: renameObject,
    renameObjects: renameObjects,
    listObjects: listObjects,
    headObjects: headObjects
  };
}());
