/**

 */

var dodgercms = dodgercms || {};

dodgercms.utils = (function() {
    'use strict';

    function getFolders(objects) {
        var folders = [];

        // push the root of the folder
        folders.push('/');

        for (var i = 0; i < objects.length; i+=1) {
            var key = objects[i].Key;

            // only want folders
            if (key.substr(-1) === '/') {
                folders.push(key);
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