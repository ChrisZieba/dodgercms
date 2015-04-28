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
    var ERROR_NO_SUCK_KEY = 'NoSuckKey';

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

    function errorHandler(code, message, retryable) {
        if (code === ERROR_EXPIRED_TOKEN) {
            $.blockUI();
            dodgercms.auth.login(function(err) {
                // remove the page blocker
                $.unblockUI();
                if (err) {
                    // redirect to the login page
                } else {
                    //window.location.reload();
                }
            });
        }
    }

    function renameObject(source, target, bucket, callback) {
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
                deleteObject(source, bucket, callback);
            }
        });
    }

    function upload(params, callback) {
        s3.upload(params, function(err, data) {
            if (err) {
                callback(err);
            } else {
                callback(null, data);
                
            }
        });
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

    function putObject(key, bucket, callback) {
        var params = {
            Bucket: bucket,
            Key: key
        };

        s3.putObject(params, function(err, data) {
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
            if (err && err.code !== ERROR_NO_SUCK_KEY) {
                callback(err);
            } else {
                callback(null, data);
                
            }
        });
    }

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

    function renameObjects(source, target, folderChange, bucket, callback) {
        // If the key is a folder we want to copy each child
        if (source.substr(-1) === '/') {

            var parts = source.replace(/\/\s*$/, "").split('/');

            // [target]
            parts.splice(-1, 1, target);

            // The key to replace the old directory
            var targetPrefix = parts.join('/') + '/';

            listObjects(source, bucket, function(err, data) {
                if (err) {
                    // TODO: handle error
                } else {
                    var contents = data.Contents;

                    // copy each object in parallel
                    async.each(contents, function(object, cb) {
                        // replace the source with the target
                        var key = targetPrefix + object.Key.substr(source.length);

                        dodgercms.s3.copyObject(object.Key, key, bucket, cb);
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
            if (folderChange) {
                dodgercms.s3.copyObject(source, target, bucket, callback);
            } else {
                var parts = source.split('/');
                // replace the last element with the user input
                parts.splice(-1, 1, target);

                var key = parts.join('/');

                dodgercms.s3.copyObject(source, key, bucket, callback);
            }
        }
    }

    function deleteObjects(key, bucket, callback) {

        // If the key is a folder we want to delete all keys inside the folder as well so we use the key name as a prefix 
        // but if its a file, no prefix will delete only the one item
        if (key.substr(-1) === '/') {
            listObjects(key, bucket, function(err, data) {
                if (err) {
                    // TODO: handle error
                } else {
                    var contents = data.Contents;
                    // delete each object in parallel
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

}(AWS));