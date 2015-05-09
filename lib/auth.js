/**
 * Authorization Library.
 *
 * This source code is licensed under the MIT-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Author: Chris Zieba (zieba.chris@gmail.com)
*/

var dodgercms = dodgercms || {};

dodgercms.auth = (function() {
  'use strict';

  /**
   * Get authentication crendentials for the buckets.
   *
   * @param {Boolean} allOrNothing Optional parameter to return null if any of the crendtials are null
   * @return {Object}
  */
  var getCredentials = function(allOrNothing) {
    var credentials = {
      dataBucket: localStorage.getItem('dodgercms-data-bucket'),
      assetsBucket: localStorage.getItem('dodgercms-assets-bucket'),
      siteBucket: localStorage.getItem('dodgercms-site-bucket'),
      accessKey: localStorage.getItem('dodgercms-access-key-id'),
      accessSecret: localStorage.getItem('dodgercms-secret-access-key')
    };

    // Exit if any credentials are missing
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

  /**
   * Returns an endpoint for the application.
   *
   * @param {String} protocol Either http or https
   * @param {String} bucket The bucket being referenced
   * @param {String} location The data center the bucket resided in
   * @return {String}
  */
  var getEndpoint = function(protocol, bucket, location) {
    // Check for empty string because of bug in AWS SDK (https://github.com/aws/aws-sdk-js/issues/590)
    if (location === '') {
      location = 'us-east-1';
    } else if (location === 'EU') {
      location = 'eu-west-1';
    }

    var endpoint = protocol + bucket + '.s3-website-' + location + '.amazonaws.com/';

    return endpoint;
  };

  /**
   * Get an IAM policy for the federated user.
   *
   * @param {String} dataBucket The bucket for the markdown content
   * @param {String} assetsBucket The bucket for the uploads
   * @param {String} siteBucket The bucket for the front end website
   * @return {String}
  */
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
  };

  /**
   * Handles the federated token creation and policy generation.
   *
   * @param {Object} params The bucket for the markdown content
   * @param {Boolean} callback
  */
  function login(params, callback) {
    // No params, just a callback
    if (arguments.length === 1) {
      // Swap the arguments
      callback = params;

      // Try and get the login info from local storage
      params = getCredentials(true);

      if (!params) {
        // The info was not present in storage, therefore the user needs to enter them again
        return callback('Could not login due to lack of user credentials.');
      }

      // Since they were already remebered
      params.remember = true;
    }

    // Make sure all fields are present
    var required = ['dataBucket', 'assetsBucket', 'siteBucket', 'accessKey', 'accessSecret'];
    for (var i=0; i < required.length; i+=1) {
      if (!params.hasOwnProperty(required[i]) && params[required[i]]) {
        // Pass the error message back
        return callback(required[i] + ' is a required field.');
      }
    }

    params.remember = params.hasOwnProperty('remember') ? Boolean(params.remember) : false;

    var sts = new AWS.STS({
      accessKeyId: params.accessKey,
      secretAccessKey: params.accessSecret,
      sslEnabled: true,
      apiVersion: '2011-06-15'
    });

    // This is the same policy as the IAM user from where the token was generated
    var policy = getPolicy(params.dataBucket, params.assetsBucket, params.siteBucket);

    var stsParams = {
      Name: 'dodgercms-buckets-policy',
      Policy: policy,
      DurationSeconds: 129600, // 36 hours
    };

    // Create the federated token for access to the buckets
    sts.getFederationToken(stsParams, function(err, data) {
      if (err) {
        return callback('Access Denied. Please make sure the acccess key and secret are correct and try again.');
      } else {
        var s3 = new AWS.S3({
          accessKeyId: data.Credentials.AccessKeyId,
          secretAccessKey: data.Credentials.SecretAccessKey,
          sessionToken: data.Credentials.SessionToken,
          sslEnabled: true
        });

        // Test the connection to each bucket
        async.each([params.dataBucket, params.assetsBucket], function(bucket, cb) {
          s3.headBucket({ Bucket: bucket }, function(err) {
            if (err) {
              cb('Access Denied. Please make sure the user attached to the access key has access to ' + bucket + '.');
            } else {
              cb();
            }
          });
        },
        // Handle any errors from the calls to the buckets
        function(err) {
          if (err) {
            return callback(err);
          } else {
            // Get the webiste information. This is needed so we can get the 
            // domain and any redirect rules that we need.
            async.parallel([
              function(cb1) {
                s3.getBucketWebsite({ Bucket: params.siteBucket }, function(err, websiteData) {
                  if (err) {
                    cb1('Access Denied. Please make sure the user attached to the access key has access to ' + params.siteBucket + '.');
                  } else {
                    // Success
                    cb1(null, websiteData);
                  }
                });
              },
              function(cb1) {
                s3.getBucketLocation({ Bucket: params.siteBucket }, function(err, locationData) {
                  if (err) {
                    cb1('Access Denied. Please make sure the user attached to the access key has access to ' + params.siteBucket + '.');
                  } else {
                    // Success
                    cb1(null, locationData);
                  }
                });
              }
            ],
            function(err, results) {
              if (err) {
                callback(err);
              } else {
                //var website = results[0];
                var location = results[1];

                // This property will not exist if the bucket is "US Standard" (https://github.com/aws/aws-sdk-js/issues/590)
                var locationConstraint = (location.hasOwnProperty('LocationConstraint')) ? location.LocationConstraint : '';

                // The endpoint is needed for the templates
                var endpoint = getEndpoint('http://', params.siteBucket, locationConstraint);

                // Store the federated user and bucket in local session data
                sessionStorage.setItem('dodgercms-token-access-key-id', data.Credentials.AccessKeyId);
                sessionStorage.setItem('dodgercms-token-secret-access-key', data.Credentials.SecretAccessKey);
                sessionStorage.setItem('dodgercms-token-session-token', data.Credentials.SessionToken);

                // If the user selected "remember me" store their access key and secret in local storage
                if (params.remember) {
                  localStorage.setItem('dodgercms-access-key-id', params.accessKey);
                  localStorage.setItem('dodgercms-secret-access-key', params.accessSecret);
                }

                localStorage.setItem('dodgercms-data-bucket', params.dataBucket);
                localStorage.setItem('dodgercms-assets-bucket', params.assetsBucket);
                localStorage.setItem('dodgercms-site-bucket', params.siteBucket);
                localStorage.setItem('dodgercms-site-endpoint', endpoint);

                // All done
                callback(null, data);
              }
            });
          }
        });
      } 
    });
  }

  /**
   * Removes the saved data from local storage.
  */
  function logout() {
    localStorage.removeItem('dodgercms-access-key-id');
    localStorage.removeItem('dodgercms-secret-access-key');
    localStorage.removeItem('dodgercms-data-bucket');
    localStorage.removeItem('dodgercms-assets-bucket');
    localStorage.removeItem('dodgercms-site-bucket');
    localStorage.removeItem('dodgercms-site-endpoint');

    redirect();
  }

  /**
   * Redirect the page.
  */
  function redirect(uri) {
    if (!uri) {
      // Use the login page as the default
      uri = location.protocol + '//' + location.host + '/login'
    }

    window.location.replace(uri);
  }

  return {
    login: login,
    logout: logout,
    redirect: redirect
  };
}());