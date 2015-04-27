/**

 */

var dodgercms = dodgercms || {};

dodgercms.utils = (function() {
    'use strict';

    function getFolders(objects) {
        var folders = [];

        // push the root
        folders.push('/');

        // Loop through each object
        for (var i = 0; i < objects.length; i+=1) {
            var object = objects[i];
            var key = object.Key;

            // split and remove last slash for directory
            var parts = key.replace(/\/\s*$/, "").split('/');

            for (var j = 0; j < parts.length; j+=1) {
                var isFolder = false;

                // if the last part in the key has a trailing slash or if the part 
                // is in not the last elemenet it is a path
                if ((j === parts.length-1 && key.substr(-1) === '/') || j !== parts.length-1) {
                    isFolder = true;
                }

                if (isFolder) {
                    var folder = parts.slice(0, j).join("/") + '/';
                    // push if unique
                    if ($.inArray(folder, folders) < 0) {
                        folders.push(folder);
                    }
                }
            }
        }

        return folders;
    };

    function newFolder(key, dataBucket, siteBucket, callback) {
        dodgercms.s3.putObject(key, dataBucket, function(err, data) {
            if (err) {
                console.log(err, err.stack);
            } else {
                dodgercms.s3.putObject(key, siteBucket, function(err, data) {
                    if (err) {
                        console.log(err, err.stack);
                    } else {
                        if (typeof callback !== 'undefined') {
                            callback(null, key);
                        }
                    }
                });
            }
        });
    }


    // The directory is null if the "New Entry" button is used,
    // but if the user right clicks in the tree this should be populated
    function newEntry(folder, bucket, callback) {
        dodgercms.s3.listObjects(bucket, function(err, data) {
            if (err) {
                // TODO: handle error
            } else {
                var folders = getFolders(data.Contents);

                var context = {
                    folders: folders,
                    selectedFolder: (folder) ? folder : null
                };

                callback(null, data);
            }
        });
    }

    return {
        newFolder: newFolder,
        newEntry: newEntry,
        getFolders: getFolders
    };
}());