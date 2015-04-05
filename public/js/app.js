$(function() {
    
    var BUCKET = "manager.entropyzx.com";
    var ENCODING_TYPE = 'url';
    var API_VERSION = '2011-06-15';

    // var ACCESS_KEY_ID = sessionStorage.getItem("lemonchop-AccessKeyId");
    // var SECRET_ACCESS_KEY sessionStorage.getItem("lemonchop-SecretAccessKey") || null;
    // var SESSION_TOKEN = sessionStorage.getItem("lemonchop-SessionToken") || null;



    // Set up the connection to S3
	var accessKeyId = sessionStorage.getItem("lemonchop-AccessKeyId");
	var secretAccessKey = sessionStorage.getItem("lemonchop-SecretAccessKey");
	var sessionToken = sessionStorage.getItem("lemonchop-SessionToken");

	var s3 = new AWS.S3({
	    accessKeyId: accessKeyId,
	    secretAccessKey: secretAccessKey,
	    sessionToken: sessionToken,
	    sslEnabled: true,
	    DurationSeconds: 129600, // 36 hours
	    apiVersion: API_VERSION
	});

	setupTree();

	$(document).bind('keydown', function(e) {
	  if (e.ctrlKey && (e.which == 83)) {
	    e.preventDefault();
	    save();
	  }
	});


	function save() {
		// get the data key attached the textra

		var key = $("#content").data("key");

		// Nothing loaded in the textarea
		if (typeof key === "undefined") {
			return;
		}

		saveKeyContent(key);
	}

	function setupTree() {
		var params = {
		  Bucket: BUCKET,
		  //Delimiter: '/',
		  EncodingType: ENCODING_TYPE,
		  //Marker: 'STRING_VALUE',
		  MaxKeys: 1000,
		  //Prefix: ''
		};

		s3.listObjects(params, function(err, data) {
		    if (err) {
		        console.log(err, err.stack);
		    } else {
		    	console.log(data);
		    	processTree(data.Name, data.Prefix, data.Contents);
		        
		    }
		});
	}

	// takes the s3 contents
	function processTree(name, prefix, contents) {
		var data = [];

		// pus hthe bucket
		data.push({
			"id" : "s3-root", 
			"parent" : '#', 
			"text" : BUCKET,
			"icon" : "fa fa-folder-open-o",
			"state": {
				"opened": true
			}
		});

		for (var i = 0; i < contents.length; i+=1) {
			var key = contents[i].Key;

			// Ignore any reserved dirs and any root level files
			if (isReserved(key) || key.indexOf('/') === -1) {
				continue;
			}

			console.log(key);
			// folder
			if (contents[i].Size === 0) {
				// This will remove the last slash and any whitespace after it:
				//key = key.replace(/\/\s*$/, "");
				
			}
			console.log('key= ',key);
			// split 
			parts = key.replace(/\/\s*$/, "").split('/');
			//console.log('parts',parts);


			for (var j = 0; j < parts.length; j+=1) {
				console.log('part=',parts[j]);
				var search =  's3-' + ((j > 0) ? parts.slice(0,j+1).join("-") : parts[j]);
				console.log('parts',parts);
				console.log('search=',search);
				var result = $.grep(data, function(e){ 
					return e.id === search; 
				});

				console.log('parent=',parts.slice(0,j-1).join("-"));


				console.log(j, parts.length-1);
				if (result.length === 0) {
					console.log('result not found')
					data.push({
						"id" : search, 
						"parent" : (j > 0) ? 's3-' + parts.slice(0,j).join("-") : 's3-root', 
						"text" : parts[j],
						// if the key has a trailing slash or is in not the last elemenet it is a folder
						"icon" : (j === parts.length-1 && key.substr(-1) === '/') ? "fa fa-folder-o" : "fa fa-file-o",
						"state": {
							"opened": true
						},
						"li_attr": {
							"data-key": key
						}
					});
				}
			}

			console.log('----------------');
		}
		//console.log(data);

		var onTreeChange = function(event, data) {
			var action = data.action;

			switch (action) {
				case "select_node":
				
					// 
					var key = data.node.li_attr["data-key"];


					// check if directory
					if (key && key.substr(-1) !== '/') {
						getKeyContent(key);
					}
					

					break;

			} 


		}

		// Render the jstree
		$('#tree')
		.on('changed.jstree', onTreeChange)
		.jstree({
		  "core" : {
		    "themes" : {
		      "dots" : false
		    },
		    "animation" : false,
		    "data": data
		  }
		});
	}

	function getKeyContent(key) {

		var params = {
		  	Bucket: BUCKET,
		  	Key: key
		};

		s3.getObject(params, function(err, data) {
		    if (err) {
		        console.log(err, err.stack);
		    } else {
		    	loadKeyContent(key, data);
		        
		    }
		});
	}

	function saveKeyContent(key) {

		var body = $("#content").val();
		console.log(body);
		var metadata = {
			"ContentType": "text/plain"
		}

		var params = {
		  	Bucket: BUCKET,
		  	Key: key,
		  	Body: body,
		  	ContentType: "text/plain",
		  	Metadata: metadata
		};

		s3.putObject(params, function(err, data) {
		    if (err) {
		        console.log(err, err.stack);
		    } else {
		    	console.log(data)
		        
		    }
		});
	}

	function loadKeyContent(key, content) {
		//var allowedContentTypes = ['application/'];

		// check if the file is a markdown file, we dont wantt o load any images, etc

		var content = content.Body.toString();

		$('#content').val(content);
		$('#content').data("key", key);

		//bodyAsString = (string) $result['Body'];
	}

	function isReserved(name) {
		// these are key names that cannot be used
		var reserved = ['admin/', 'public/'];
		var isReserved = false;

		for (var i = 0; i < reserved.length; i+=1) {
			if (name.substring(0, reserved[i].length) == reserved[i]) {
				isReserved = true;
			}
		}

		return isReserved;
	}





});