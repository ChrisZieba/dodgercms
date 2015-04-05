$(function() {
    
	$("#login-form").submit(function(event) {

	  	//var accessKey = $("#login-form-access-key").val();
	  	//var accessSecret = $("#login-form-access-secret").val();

	  	var accessKey = 'AKIAJC2XSOXRLG3X7POQ';
	  	var accessSecret = '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';



		var sts = new AWS.STS({
	  		accessKeyId: accessKey,
	  		secretAccessKey: accessSecret,
	  		sslEnabled: true,
	  		DurationSeconds: 129600, // 36 hours
	  		apiVersion: '2011-06-15'
		});

/*
{
	"Version": "2012-10-17",
	"Id": "Policy1427772347182",
	"Statement": [
		{
			"Sid": "Stmt1427772340560",
			"Effect": "Allow",
			"Principal": "*",
			"Action": [
				"s3:GetObjectVersion",
				"s3:GetObject"
			],
			"NotResource": [
				"arn:aws:s3:::entropyzx.com/admin/",
				"arn:aws:s3:::entropyzx.com/admin/*"
			]
		}
	]
}

*/

	  	// This is the same policy as the user
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

	  	var params = {
	  		Name: 'lemonchop',
	  		Policy: policy,
	  		DurationSeconds: 129600, // 36 hours
	  	};


		sts.getFederationToken(params, function(err, data) {
		  if (err) {
		  	console.log(err, err.stack);
		  	alert(err.message);
		  } else{
		  	console.log(data);
		  	// Store the federated user in local session data
		  	sessionStorage.setItem("lemonchop-AccessKeyId", data.Credentials.AccessKeyId);
		  	sessionStorage.setItem("lemonchop-SecretAccessKey",data.Credentials.SecretAccessKey);
		  	sessionStorage.setItem("lemonchop-SessionToken", data.Credentials.SessionToken);

		  	// redirect
		  	//window.location.replace("http://localhost/www/dodgercms/admin/dashboard.html");

		  } 
		});

		event.preventDefault();
	});
});