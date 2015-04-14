$(function() {


    function login(dataBucket, assetsBucket, accessKey, accessSecret, remember, callback) {


        var sts = new AWS.STS({
            accessKeyId: accessKey,
            secretAccessKey: accessSecret,
            sslEnabled: true,
            DurationSeconds: 129600, // 36 hours
            apiVersion: '2011-06-15'
        });

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
                        '"arn:aws:s3:::' + assetsBucket + '/*"' +
                    ']' +
                '}' +
            ']' +
        '}';

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

                s3.headBucket({ Bucket: dataBucket }, function(err) {
                    if (err) {
                        return callback("Access Denied. Please make sure the user attached to the access key has access to the data bucket.");
                    } else {
                        s3.headBucket({ Bucket: assetsBucket }, function(err) {
                            if (err) {
                                return callback("Access Denied. Please make sure the user attached to the access key has access to the assets entered.");
                            } else {
                                // Store the federated user and bucket in local session data
                                sessionStorage.setItem("dodgercms-token-access-key-id", data.Credentials.AccessKeyId);
                                sessionStorage.setItem("dodgercms-token-secret-access-key", data.Credentials.SecretAccessKey);
                                sessionStorage.setItem("dodgercms-token-session-token", data.Credentials.SessionToken);

                                // If the user selected "remember me" store their access key and secret in local storage
                                if (remember) {
                                    localStorage.setItem("dodgercms-access-key-id", accessKey);
                                    localStorage.setItem("dodgercms-secret-access-key", accessSecret);
                                }

                                localStorage.setItem("dodgercms-data-bucket", dataBucket);
                                localStorage.setItem("dodgercms-assets-bucket", assetsBucket);

                                // Success
                                callback(null, data)
                            }
                        });
                    }
                });
            } 
        });
    }

    function logout() {

    }
});