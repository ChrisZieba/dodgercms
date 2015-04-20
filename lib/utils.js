/**

 */

var dodgercms = dodgercms || {};

dodgercms.utils = (function() {
    'use strict';

    function newFolder(currentFolder, newFolder, dataBucket, siteBucket, callback) {
        console.log(currentFolder, newFolder);
        // create a new Folder key
        var key = (currentFolder === '/') ? newFolder + '/' : currentFolder + newFolder + '/';

        dodgercms.s3.putObject(key, dataBucket, function(err, data) {
            if (err) {
                console.log(err, err.stack);
            } else {
                dodgercms.s3.putObject(key, siteBucket, function(err, data) {
                    if (err) {
                        console.log(err, err.stack);
                    } else {
                        if (typeof callback !== 'undefined') {
                            callback(null, data);
                        }
                    }
                });
            }
        });
    }

    return {
        newFolder: newFolder
    };
}());