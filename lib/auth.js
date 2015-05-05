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
      siteBucket: localStorage.getItem("dodgercms-site-bucket"),
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

  var getEndpoint = function(protocol, bucket, location) {
    if (location === '') {
      location = 'us-east-1'
    } else if (location === 'EU') {
       location = 'eu-west-1';
    }

    var endpoint = protocol + bucket + '.s3-website-' + location + '.amazonaws.com/';

    return endpoint;
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
            '"s3:PutObject",' +
            '"s3:GetBucketWebsite",' +
            '"s3:PutBucketWebsite",' +
            '"s3:DeleteBucketWebsite",' +
            '"s3:GetBucketLogging",' +
            '"s3:GetBucketVersioning",' +
            '"s3:GetBucketLocation"' +
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
      params.remember = true;
    }

    var required = ['dataBucket', 'assetsBucket', 'siteBucket', 'accessKey', 'accessSecret']
    for (var i=0; i< required.length; i+=1) {
      if (!params.hasOwnProperty(required[i]) && params[required[i]]) {
        callback(required[i] + ' is a required field.');
        return;
      }
    }

    params.remember = params.hasOwnProperty('remember') ? Boolean(params.remember) : false;

    var sts = new AWS.STS({
      accessKeyId: params.accessKey,
      secretAccessKey: params.accessSecret,
      sslEnabled: true,
      apiVersion: '2011-06-15'
    });

    // This is the same policy as the user from where the token was generated
    var policy = getPolicy(params.dataBucket, params.assetsBucket, params.siteBucket);

    var stsParams = {
      Name: 'dodgercms-buckets-policy',
      Policy: policy,
      DurationSeconds: 129600, // 36 hours
    };

    sts.getFederationToken(stsParams, function(err, data) {
      if (err) {
        return callback("Access Denied. Please make sure the acccess key and secret are correct and try again.");
      } else {
        var s3 = new AWS.S3({
          accessKeyId: data.Credentials.AccessKeyId,
          secretAccessKey: data.Credentials.SecretAccessKey,
          sessionToken: data.Credentials.SessionToken,
          sslEnabled: true
        });

        async.each([params.dataBucket, params.assetsBucket], function(bucket, cb) {
          s3.headBucket({ Bucket: bucket }, function(err) {
            if (err) {
              cb("Access Denied. Please make sure the user attached to the access key has access to " + bucket + ".");
            } else {
              cb();
            }
          });
        }, 
        function(err) {
          // If any of the file processing produced an error, err would equal that error
          if (err) {
            // One of the iterations produced an error, all processing will now stop
            return callback(err);
          } else {
            /**
             * Get the webiste information. This is needed so we can get the domain and 
             * any redirect rules that we need.
             */
            async.parallel([
              function(cb1) {
                s3.getBucketWebsite({ Bucket: params.siteBucket }, function(err, websiteData) {
                  if (err) {
                    cb1("Access Denied. Please make sure the user attached to the access key has access to " + params.siteBucket + ".");
                  } else {
                    // Success
                    cb1(null, websiteData);
                  }
                });
              },
              function(cb1) {
                s3.getBucketLocation({ Bucket: params.siteBucket }, function(err, locationData) {
                  if (err) {
                    cb1("Access Denied. Please make sure the user attached to the access key has access to " + params.siteBucket + ".");
                  } else {
                    // Success
                    cb1(null, locationData);
                  }
                });
              }
            ],
            function(err, results) {
              // the results array will equal ['one','two']
              if (err) {
                callback(err);
              } else {
                var website = results[0];
                var location = results[1];

                // This property will not exist if the bucket is "US Standard". See: https://github.com/aws/aws-sdk-js/issues/590
                var locationConstraint = (location.hasOwnProperty('LocationConstraint')) ? location.LocationConstraint : '';
                var endpoint = getEndpoint('http://', params.siteBucket, locationConstraint);

                // Store the federated user and bucket in local session data
                sessionStorage.setItem("dodgercms-token-access-key-id", data.Credentials.AccessKeyId);
                sessionStorage.setItem("dodgercms-token-secret-access-key", data.Credentials.SecretAccessKey);
                sessionStorage.setItem("dodgercms-token-session-token", data.Credentials.SessionToken);

                // If the user selected "remember me" store their access key and secret in local storage
                if (params['remember']) {
                  localStorage.setItem("dodgercms-access-key-id", params.accessKey);
                  localStorage.setItem("dodgercms-secret-access-key", params.accessSecret);
                }

                localStorage.setItem("dodgercms-data-bucket", params.dataBucket);
                localStorage.setItem("dodgercms-assets-bucket", params.assetsBucket);
                localStorage.setItem("dodgercms-site-bucket", params.siteBucket);
                localStorage.setItem("dodgercms-site-endpoint", endpoint);

                // Success
                callback(null, data);
              }
            });
          }
        });
      } 
    });
  };

  var logout = function() {
    localStorage.removeItem("dodgercms-access-key-id");
    localStorage.removeItem("dodgercms-secret-access-key");
    localStorage.removeItem("dodgercms-data-bucket");
    localStorage.removeItem("dodgercms-assets-bucket");
    localStorage.removeItem("dodgercms-site-bucket");
    localStorage.removeItem("dodgercms-site-endpoint");

    redirect();
  };

  var redirect = function(uri) {
    if (uri) {

    }


  };

  return {
    login: login,
    logout: logout,
    redirect: redirect
  };
}());