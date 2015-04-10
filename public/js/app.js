$(function() {
    
    var BUCKET = "manager.entropyzx.com";
    var ENCODING_TYPE = 'url';
    var API_VERSION = '2011-06-15';

    // var ACCESS_KEY_ID = sessionStorage.getItem("lemonchop-AccessKeyId");
    // var SECRET_ACCESS_KEY sessionStorage.getItem("lemonchop-SecretAccessKey") || null;
    // var SESSION_TOKEN = sessionStorage.getItem("lemonchop-SessionToken") || null;



    // Set up the connection to S3
    var accessKeyId = sessionStorage.getItem("dodgercms-token-access-key-id");
    var secretAccessKey = sessionStorage.getItem("dodgercms-token-secret-access-key");
    var sessionToken = sessionStorage.getItem("dodgercms-token-session-token");

	var s3 = new AWS.S3({
	    accessKeyId: accessKeyId,
	    secretAccessKey: secretAccessKey,
	    sessionToken: sessionToken,
	    sslEnabled: true,
	    DurationSeconds: 129600, // 36 hours
	    apiVersion: API_VERSION
	});

	getS3Objects(processTree);
	//registerEventhandlers();

	$(document).bind('keydown', function(e) {
	  if (e.ctrlKey && (e.which == 83)) {
	    e.preventDefault();
	    save();
	  }
	});

    // login functionality
    $(document).on("submit", "#new-entry-form", function(event) {
    	console.log('wtf');
        var title = $.trim($("#new-entry-form-title").val());
        var slug = $.trim($("#new-entry-form-slug").val());
        var content = $.trim($("#new-entry-form-content").val());
        var dir = $("#new-entry-form-dir option:selected" ).data('dir');

        console.log(dir);

        var key = (dir !== '/') ? dir + slug : slug;
        console.log(key);
        // create the new key in s3
		var params = {
			Bucket: BUCKET,
			Key: key,
			Body: content,
			ContentEncoding: 'utf-8',
            ContentType: "text/html",
            Expires: 0,
            CacheControl: "public, max-age=0, no-cache",
			Metadata: {
				title: title,
			}
		};
		s3.putObject(params, function(err, data) {
			if (err) {

			} else {
				console.log(data);
			}
		});

       	event.preventDefault();

    });

	$(document).on("click", "#preview-entry", function(event) {
		var content = $.trim($("#new-entry-form-content").val());
		console.log('preview')
		console.log(marked(content));
		// create a new
	});

	$('#new-entry').click(function(event) {
		// clear the content
		newEntry();
		// create a new
	});

	function newEntry() {
		var source   = $("#edit-entry-template").html();
		var template = Handlebars.compile(source);

		getS3Objects(function(err, data) {
			if (err) {
				// soemting
			} else {
				var name = data.Name;
				var prefix = data.Prefix;
				var contents = data.Contents;
				var dirs = [];

				// push the root of the folder
				dirs.push('/');

				for (var i = 0; i < contents.length; i+=1) {
					var key = contents[i].Key;

					// only want directories
					if (key.substr(-1) === '/') {
						dirs.push(key);
					}
					
				}

				var context = {
					dirs: dirs
				};
				var html = template(context);
				$("#main").html(html);
			}
		});

	}



	function save() {
		// get the data key attached the textra

		var key = $("#content").data("key");

		// Nothing loaded in the textarea
		if (typeof key === "undefined") {
			return;
		}

		saveKeyContent(key);
	}

	// function setupTree() {
	// 	var params = {
	// 	  	Bucket: BUCKET,
	// 	  	EncodingType: ENCODING_TYPE,
	// 	  	MaxKeys: 1000,
	// 	};

	// 	s3.listObjects(params, function(err, data) {
	// 	    if (err) {
	// 	        console.log(err, err.stack);
	// 	        // show the login if credentials ar expired or incorrect
	// 	    } else {
	// 	    	console.log(data);
	// 	    	processTree(data.Name, data.Prefix, data.Contents);
		        
	// 	    }
	// 	});
	// }

	function getS3Objects(callback) {
		var params = {
		  	Bucket: BUCKET,
		  	EncodingType: ENCODING_TYPE,
		  	MaxKeys: 1000,
		};

		s3.listObjects(params, function(err, data) {
		    if (err) {
		        console.log(err, err.stack);
		        // show the login if credentials ar expired or incorrect
		    } else {
		    	callback(null, data)
		        
		    }
		});
	}

	// takes the s3 contents
	function processTree(err, data) {
		var name = data.Name;
		var prefix = data.Prefix;
		var contents = data.Contents;

		var tree = [];

		// pus hthe bucket
		tree.push({
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

			console.log('key= ',key);

			// split and remove last slash for directory
			parts = key.replace(/\/\s*$/, "").split('/');


			for (var j = 0; j < parts.length; j+=1) {
				console.log('part=',parts[j]);
				var search =  's3-' + ((j > 0) ? parts.slice(0,j+1).join("-") : parts[j]);
				console.log('parts',parts);

				var result = $.grep(tree, function(e){ 
					return e.id === search; 
				});

				console.log('parent=',parts.slice(0,j-1).join("-"));


				console.log(j, parts.length-1);
				if (result.length === 0) {
					console.log('result not found')
					tree.push({
						"id" : search, 
						"parent" : (j > 0) ? 's3-' + parts.slice(0,j).join("-") : 's3-root', 
						"text" : parts[j],
						// if the key has a trailing slash or is in not the last elemenet it is a folder
						"icon" : (j === parts.length-1 && key.substr(-1) === '/') ? "fa fa-folder-open-o" : "fa fa-file-o",
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
		    "data": tree
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



        // <input type="file" id="file-chooser" /> 


        // <script type="text/javascript">
        //     var accessKeyId = sessionStorage.getItem("dodgercms-token-access-key-id");
        //     var secretAccessKey = sessionStorage.getItem("dodgercms-token-secret-access-key");
        //     var sessionToken = sessionStorage.getItem("dodgercms-token-session-token");

        //     var s3 = new AWS.S3({
        //         accessKeyId: accessKeyId,
        //         secretAccessKey: secretAccessKey,
        //         sessionToken: sessionToken,
        //         sslEnabled: true,
        //         DurationSeconds: 129600, // 36 hours
        //         apiVersion: '2011-06-15'
        //     });

        // $("#file-chooser").change(function(){
        //     var file = $("#file-chooser")[0].files[0];
        //     if (file) {

        //       var params = {
        //         Bucket: BUCKET,
        //         Key: file.name, 
        //         ContentType: file.type, 
        //         Body: file
        //     };
        //       s3.upload(params, function (err, data) {
        //         if (err) {

        //         } else {
        //             var content =  $('#content');
        //                 var cursorPosStart = content.prop('selectionStart');
        //                 var cursorPosEnd = content.prop('selectionEnd');
        //                 var v = content.val();
        //                 var textBefore = v.substring(0,  cursorPosStart );
        //                 var textAfter  = v.substring( cursorPosEnd, v.length );
        //                 content.val(textBefore + '[]' + file.name + '()' + textAfter);

        //         }
        //       });
        //     } 
        //  });


        // </script>

});