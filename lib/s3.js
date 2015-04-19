/**

 */

var dodgercms = dodgercms || {};

dodgercms.s3 = (function(AWS) {
    'use strict';

    var ENCODING_TYPE = 'url';
    var API_VERSION = '2011-06-15';
    var CONTENT_TYPE = 'text/plain; charset=UTF-8';
    var ENDPOINT = 's3.amazonaws.com';
    var ERROR_EXPIRED_TOKEN = 'ExpiredToken';

    var s3 = null;

    function init(accessKeyId, secretAccessKey, sessionToken) {

        if (!s3) {
            s3 = new AWS.S3({
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
                sessionToken: sessionToken,
                sslEnabled: true,
                DurationSeconds: 129600, // 36 hours
                apiVersion: API_VERSION,
                maxRetries: 3
            });
        }

        return s3;
    }

    function getObject(key, bucket, callback) {
        var params = {
            Bucket: bucket,
            Key: key
        };

        s3.getObject(params, function(err, data) {
            if (err) {
                callback(err);
            } else {
                callback(null, data);
                
            }
        });
    }

    function deleteObject(key, bucket, callback) {
        var params = {
            Bucket: bucket,
            Key: key
        };

        s3.deleteObject(params, function(err, data) {
            if (err) {
                callback(err);
            } else {
                callback(null, data);
                
            }
        });
    }

    function deleteObjects(key, bucket, callback) {
        console.log(key);

        // If the key is a folder we want to delete all keys inside the folder as well so we use the key name as a prefix 
        // but if its a file, no prefix will delete only the one item
        if (key.substr(-1) === '/') {
            listObjects(key, bucket, function(err, data) {
                if (err) {
                    // TODO: handle error
                } else {
                    var contents = data.Contents;
                    // get each object in parallel
                    async.each(contents, function(object, cb) {
                        dodgercms.s3.deleteObject(object.Key, bucket, cb);
                    }, function(err) {
                        // if any of the file processing produced an error
                        if (err) {
                            callback(err);
                        } else {
                            // remove all the files from the site bucket
                            callback(null);
                        }
                    });
                }
            });
        } else {
            // just delete the one key
            dodgercms.s3.deleteObject(key, bucket, callback);
        }
    }

    function listObjects(prefix, bucket, callback) {
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

        s3.listObjects(params, function(err, data) {
            if (err) {
                errorHandler(err.code, err.message, err.retryable);
            } else {
                callback(null, data)
            }
        });
    }

    // need to make a head request for each key 
    // usefula after getting a list of objects
    function headObjects(contents, bucket, callback) {
        var keys = [];

        // keep track of how many requests were made
        var completed = 0;

        if (contents.length > 0) {
            for (var i = 0; i < contents.length; i+=1) {
                (function(index, object){
                    s3.headObject({
                        Bucket: bucket, 
                        Key: object.Key
                    }, function(err, data) {
                        if (err) {
                            callback(err);
                        } else {
                            completed+=1;
                            // add the Key attribute
                            data.Key = object.Key;
                            keys.push(data);
                            console.log(keys);
                            // When the requests have all finished
                            if (completed === contents.length) {
                                callback(null, keys);
                            }
                        }
                    });
                }(i, contents[i]));
            }
        } else {
            callback(null, []);
        }
    }

    return {
        init: init,
        getObject: getObject,
        deleteObject: deleteObject,
        deleteObjects: deleteObjects,
        listObjects: listObjects,
        headObjects: headObjects
    };

}(AWS));