$(function() {

    autofill();

    // fill in the form values if they exist locally
    function autofill() {
        $("#login-form-access-key").val(localStorage.getItem("dodgercms-access-key-id") || '');
        $("#login-form-access-secret").val(localStorage.getItem("dodgercms-secret-access-key") || '');
        $("#login-form-bucket").val(localStorage.getItem("dodgercms-bucket") || '');
    }

    function login(bucket, accessKey, accessSecret, remember, callback) {


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
                        '"arn:aws:s3:::' + bucket + '",' +
                        '"arn:aws:s3:::' + bucket + '/*"' +
                    ']' +
                '}' +
            ']' +
        '}';

        var stsParams = {
            Name: 'dodgercms-bucket-policy',
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

                var s3Params = {
                    Bucket: bucket
                };

                s3.headBucket(s3Params, function(err) {
                    if (err) {
                        return callback("Access Denied. Please make sure the user attached to the access key has access to the bucket entered.");
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

                        localStorage.setItem("dodgercms-bucket", bucket);

                        // Success
                        callback(null, data)
                    }
                });
            } 
        });
    }

    function logout() {

    }

    // login functionality
    $("#login-form").submit(function(event) {

        var accessKey = $.trim($("#login-form-access-key").val());
        var accessSecret = $.trim($("#login-form-access-secret").val());
        var bucket = $.trim($("#login-form-bucket").val());
        var remember = $("#login-remember").is(":checked");

        // validate the form fields
        if (accessKey === '' || accessSecret === '' || bucket === '') {
            alert('All fields are required.');
            event.preventDefault();
            return;
        }

        login(bucket, accessKey, accessSecret, remember, function(err, data) {
            if (err) {
                alert(err);
            } else {
                window.location.replace(location.protocol + "//" + location.host);
            }
        });


        // var sts = new AWS.STS({
        //     accessKeyId: accessKey,
        //     secretAccessKey: accessSecret,
        //     sslEnabled: true,
        //     DurationSeconds: 129600, // 36 hours
        //     apiVersion: '2011-06-15'
        // });

        // // This is the same policy as the user from where the token was generated
        // var policy = '{' +
        //     '"Version": "2012-10-17",' +
        //     '"Statement": [' +
        //         '{' +
        //             '"Sid": "Stmt1427944232000",' +
        //             '"Effect": "Allow",' +
        //             '"Action": [' +
        //                 '"s3:ListBucket",' +
        //                 '"s3:GetObject",' +
        //                 '"s3:DeleteObject",' +
        //                 '"s3:PutObject"' +
        //             '],' +
        //             '"Resource": [' +
        //                 '"arn:aws:s3:::' + bucket + '",' +
        //                 '"arn:aws:s3:::' + bucket + '/*"' +
        //             ']' +
        //         '}' +
        //     ']' +
        // '}';

        // var stsParams = {
        //     Name: 'dodgercms-bucket-policy',
        //     Policy: policy,
        //     DurationSeconds: 129600, // 36 hours
        // };

        // sts.getFederationToken(stsParams, function(err, data) {
        //   if (err) {
        //         alert("Access Denied. Please make sure the acccess key and secret are correct and try again.");
        //   } else{
        //         // Store the federated user and bucket in local session data
        //         sessionStorage.setItem("dodgercms-token-access-key-id", data.Credentials.AccessKeyId);
        //         sessionStorage.setItem("dodgercms-token-secret-access-key", data.Credentials.SecretAccessKey);
        //         sessionStorage.setItem("dodgercms-token-session-token", data.Credentials.SessionToken);

        //         // If the user selected "remember me" store their access key and secret in local storage
        //         if (remember) {
        //             localStorage.setItem("dodgercms-access-key-id", accessKey);
        //             localStorage.setItem("dodgercms-secret-access-key", accessSecret);
        //         }

        //         var s3 = new AWS.S3({
        //             accessKeyId: data.Credentials.AccessKeyId,
        //             secretAccessKey: data.Credentials.SecretAccessKey,
        //             sessionToken: data.Credentials.SessionToken,
        //             sslEnabled: true
        //         });

        //         var s3Params = {
        //             Bucket: bucket
        //         };

        //         s3.headBucket(s3Params, function(err, data) {
        //             if (err) {
        //                 alert("Access Denied. Please make sure the user attached to the access key has access to the bucket entered.");
        //             } else {
        //                 localStorage.setItem("dodgercms-bucket", bucket);

        //                 // Success
        //                 window.location.replace(location.protocol + "//" + location.host);
        //             }
        //         });
        //     } 
        // });

        event.preventDefault();
    });
});