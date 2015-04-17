/**

 */

var dodgercms = dodgercms || {};

dodgercms.auth = (function() {
    'use strict';

    // Optional paramter to return null if any of the crendtials are null
    var getCredentials = function(allOrNothing) {
        var credentials = {
            dataBucket: localStorage.getItem("dodgercms-data-bucket"),
            assetsBucket: localStorage.getItem("dodgercms-assets-bucket"),
            accessKey: localStorage.getItem("dodgercms-access-key-id"),
            accessSecret : localStorage.getItem("dodgercms-secret-access-key")
        };

        if (allOrNothing) {
            for (var property in credentials) {
                if (credentials.hasOwnProperty(property)) {
                    if (!credentials[property]) {
                        return null;
                    }
                }
            }

        }

        return credentials;
    };

    var getPolicy = function(dataBucket, assetsBucket, siteBucket) {
        // This is the same policy as the user from where the token was generated
        var policy = '{' +
            '"Version": "2012-10-17",' +
            '"Statement": [' +
                '{' +
                    '"Sid": "Stmt1427944232000",' +
                    '"Effect": "Allow",' +
                    '"Action": [' +
                        '"s3:ListBucket",' +
                        '"s3:GetObject",' +
                        '"s3:DeleteObject",' +
                        '"s3:PutObject"' +
                    '],' +
                    '"Resource": [' +
                        '"arn:aws:s3:::' + dataBucket + '",' +
                        '"arn:aws:s3:::' + dataBucket + '/*",' +
                        '"arn:aws:s3:::' + assetsBucket + '",' +
                        '"arn:aws:s3:::' + assetsBucket + '/*",' +
                        '"arn:aws:s3:::' + siteBucket + '",' +
                        '"arn:aws:s3:::' + siteBucket + '/*"' +
                    ']' +
                '}' +
            ']' +
        '}';

        return policy;
    }

    var login = function(params, callback) {
        console.log(params, callback)
        // no params, just a callback
        if (arguments.length === 1) {
            // Swap the arguments
            callback = params;

            // try and get the login info from storage
            params = getCredentials(true);

            if (!params) {
                // The info was not present in storage, therefore the user needs to enter them again
                return callback("Could not login due to lack of user credentials.");
            }

            // Since they were already remebered
            params['remember'] = true;
        }

        var required = ['dataBucket', 'assetsBucket', 'accessKey', 'accessSecret']
        for (var i=0; i< required.length; i+=1) {
            if (!params.hasOwnProperty(required[i]) && params[required[i]]) {
                callback(required[i] + ' is a required field.');
                return;
            }
        }

        params['remember'] = params.hasOwnProperty('remember') ? Boolean(params['remember']) : false;

        var sts = new AWS.STS({
            accessKeyId: params['accessKey'],
            secretAccessKey: params['accessSecret'],
            sslEnabled: true,
            DurationSeconds: 129600, // 36 hours
            apiVersion: '2011-06-15'
        });

        // This is the same policy as the user from where the token was generated
        var policy = getPolicy(params['dataBucket'], params['assetsBucket'], 'dodgercms.com');

        var stsParams = {
            Name: 'dodgercms-buckets-policy',
            Policy: policy,
            DurationSeconds: 129600, // 36 hours
        };

        sts.getFederationToken(stsParams, function(err, data) {
            if (err) {
                return callback("Access Denied. Please make sure the acccess key and secret are correct and try again.");
            } else{


                var s3 = new AWS.S3({
                    accessKeyId: data.Credentials.AccessKeyId,
                    secretAccessKey: data.Credentials.SecretAccessKey,
                    sessionToken: data.Credentials.SessionToken,
                    sslEnabled: true
                });

                // TODO: use async and do this in parallet
                s3.headBucket({ Bucket: params['dataBucket'] }, function(err) {
                    if (err) {
                        return callback("Access Denied. Please make sure the user attached to the access key has access to the data bucket.");
                    } else {
                        s3.headBucket({ Bucket: params['assetsBucket'] }, function(err) {
                            if (err) {
                                return callback("Access Denied. Please make sure the user attached to the access key has access to the assets entered.");
                            } else {
                                s3.headBucket({ Bucket: 'dodgercms.com' }, function(err) {
                                    if (err) {
                                        return callback("Access Denied. Please make sure the user attached to the access key has access to the site bucket.");
                                    } else {
                                        // Store the federated user and bucket in local session data
                                        sessionStorage.setItem("dodgercms-token-access-key-id", data.Credentials.AccessKeyId);
                                        sessionStorage.setItem("dodgercms-token-secret-access-key", data.Credentials.SecretAccessKey);
                                        sessionStorage.setItem("dodgercms-token-session-token", data.Credentials.SessionToken);

                                        // If the user selected "remember me" store their access key and secret in local storage
                                        if (params['remember']) {
                                            localStorage.setItem("dodgercms-access-key-id", params['accessKey']);
                                            localStorage.setItem("dodgercms-secret-access-key", params['accessSecret']);
                                        }

                                        localStorage.setItem("dodgercms-data-bucket", params['dataBucket']);
                                        localStorage.setItem("dodgercms-assets-bucket", params['assetsBucket']);

                                        // Success
                                        callback(null, data)
                                    }
                                });
                            }
                        });
                    }
                });
            } 
        });
    };

    var logout = function() {

    };

    return {
        login: login
    };
}());