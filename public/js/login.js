$(function() {
    
    $("#login-form").submit(function(event) {

        var accessKey = $("#login-form-access-key").val();
        var accessSecret = $("#login-form-access-secret").val();
        var bucket = $("#login-form-bucket").val();
        var remember = $("#login-remember-me").is(":checked"));

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
                        '"arn:aws:s3:::manager.entropyzx.com",' +
                        '"arn:aws:s3:::manager.entropyzx.com/*"' +
                    ']' +
                '}' +
                // '{' +
                //     '"Effect": "Allow",' +
                //     '"Action": "sts:GetFederationToken",' +
                //     '"Resource": "*"' +
                // '}' +
            ']' +
        '}';

        var stsParams = {
            Name: 'dodgercms-policy',
            Policy: policy,
            DurationSeconds: 129600, // 36 hours
        };

        sts.getFederationToken(stsParams, function(err, data) {
          if (err) {
            console.log(err, err.stack);
            alert("Access Denied. Please make sure the acccess key and secret are correct and try again.");
          } else{
            console.log(data);
            // Store the federated user and bucket in local session data
            sessionStorage.setItem("dodgercms-token-access-key-id", data.Credentials.AccessKeyId);
            sessionStorage.setItem("dodgercms-token-secret-access-key", data.Credentials.SecretAccessKey);
            sessionStorage.setItem("dodgercms-token-session-token", data.Credentials.SessionToken);
            

            // If the user selected "remember me" store their access key and secret as well
            if (remember) {
                sessionStorage.setItem("dodgercms-access-key-id", accessKey);
                sessionStorage.setItem("dodgercms-secret-access-key", accessSecret);
            }

            var s3 = new AWS.S3({
                accessKeyId: data.Credentials.AccessKeyId,
                secretAccessKey: data.Credentials.SecretAccessKey,
                sessionToken: data.Credentials.SessionToken,
                sslEnabled: true
            });

            var s3Params = {
                 Bucket: bucket
            };

            s3.headBucket(s3Params, function(err, data) {
                if (err) {
                    alert("Access Denied. Please make sure the user attached to the access key has access to the bucket entered.");
                } else {
                    sessionStorage.setItem("dodgercms-bucket", bucket);

                    // Success
                    window.location.replace("http://localhost/www/dodgercms/admin/dashboard.html");
                }
            });
          } 
        });

        event.preventDefault();
    });
});