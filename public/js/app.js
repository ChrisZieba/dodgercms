$(function() {
    
    var DATA_BUCKET = localStorage.getItem('dodgercms-data-bucket');
    var ASSETS_BUCKET = localStorage.getItem('dodgercms-assets-bucket');
    var ENCODING_TYPE = 'url';
    var API_VERSION = '2011-06-15';
    var CONTENT_TYPE = 'text/plain; charset=UTF-8';
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

	// need to make a head request for each key 
	// usefula after getting a list of objects
	function headS3Objects(contents, callback) {
		var keys = [];

		if (contents.length > 0) {
			for (var i = 0; i < contents.length; i+=1) {
				(function(index, object){
	                s3.headObject({
	                    Bucket: DATA_BUCKET, 
	                    Key: object.Key
	                }, function(err, data) {
	                    if (err) {
	                        callback(err);
	                    } else {
	                        // add the Key attribute
	                        data.Key = object.Key;
	                        keys.push(data);
	                        if (index===contents.length-1) {
	                        	callback(null, keys);
	                        }
	                    }
	                });
				}(i, contents[i]));
			}
		} else {
			callback(null, []);
		}
	}

	getS3Objects(function(err, data) {
		var name = data.Name;
		var prefix = data.Prefix;
		var contents = data.Contents;
		console.dir(contents);
		console.log('------contents----------')
		var tree = [];

		// push the bucket
		tree.push({
			"id" : "s3-root", 
			"parent" : '#', 
			"text" : DATA_BUCKET,
			"icon" : "fa fa-folder-open-o",
			"state": {
				"opened": true
			}
		});

		headS3Objects(contents, function(err, data) {
			console.log(contents);
			for (var i = 0; i < data.length; i+=1) {
				var object = data[i];
				var key = object.Key;
				console.log(key);
				console.dir(object);



				if (key.substr(-1) !== '/') {
					// anything other than a directory or text/plain (markdown) will be ignored
					if (object.ContentType !== CONTENT_TYPE) {
						continue;
					}
				}

				console.log('key= ',key);

				// split and remove last slash for directory
				parts = key.replace(/\/\s*$/, "").split('/');


				for (var j = 0; j < parts.length; j+=1) {
					var isDir = false;
					console.log('part=',parts[j]);
					var search =  's3-' + ((j > 0) ? parts.slice(0,j+1).join("-") : parts[j]);
					console.log('parts',parts);

					// Check to see if the id exists in the tree already
					var result = $.grep(tree, function(e) { 
						return e.id === search; 
					});

					console.log('parent=',parts.slice(0,j-1).join("-"));
					console.log(j, parts.length-1);

					// if the last part in the key has a trailing slash or if the part 
					// is in not the last elemenet it is a path
					if ((j === parts.length-1 && key.substr(-1) === '/') || j !== parts.length-1) {
						isDir = true;
					}

					console.log('isdir='+isDir)

					// Only want to push a new node onto the tree if unique
					if (result.length === 0) {
						var node = {
							"id" : search, 
							"parent" : (j > 0) ? 's3-' + parts.slice(0,j).join("-") : 's3-root', 
							"text" : parts[j],

							"icon" : (isDir) ? "fa fa-folder-open-o" : "fa fa-file-o",
							"state": {
								"opened": true
							}
						};
					}

					// Only key ojects need the data aatrivute
					if (!isDir) {
						node.li_attr = {
							"data-key": key
						};
					}

					tree.push(node);
				}

				console.log('----------------');
			}

			var onTreeChange = function(event, data) {
				var action = data.action;

				switch (action) {
					case "select_node":
					
						// 
						var key = data.node.li_attr["data-key"];

						// The key atribuete only exists on files, not folders
						if (key) {
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
		});

	
	});
	//registerEventhandlers();

	$(document).bind('keydown', function(e) {
	  if (e.ctrlKey && (e.which == 83)) {
	    e.preventDefault();
	    save();
	  }
	});



    // A new entry is submitted
    $(document).on("submit", "#new-entry-form", function(event) {
    	event.preventDefault();

    	console.log('wtf');
        var title = $.trim($("#new-entry-form-title").val());
        var slug = $.trim($("#new-entry-form-slug").val());
        var content = $.trim($("#new-entry-form-content").val());
        var dir = $("#new-entry-form-dir option:selected" ).data('dir');

        // The title cannot be empty
        if (!title.length || title.length > 64) {
    		alert("The title can not be empty.");
    		return;
        }

        // the title needs to be between 1 and 32 characters
        if (!/^([a-zA-Z0-9-_]){3,32}$/.test(slug)) {
    		alert("The url slug must be at least 3 characters and can only contain letters, numbers, dashed and underscores.");
    		return;
        }


        console.log(dir);

        // All markdown files are placed in the content folder
        var key = "content/";
        key += (dir !== '/') ? dir + slug : slug;
        console.log(key);
        // create the new key in s3
		var params = {
			Bucket: DATA_BUCKET,
			Key: key,
			Body: content,
			ContentEncoding: 'utf-8',
            ContentType:  CONTENT_TYPE,
            Expires: 0,
            CacheControl: "public, max-age=0, no-cache",
			Metadata: {
				"x-amz-meta-title": title,
			}
		};
		s3.putObject(params, function(err, data) {
			if (err) {

			} else {
				console.log(data);
			}
		});



    });

	$(document).on("click", "#preview-entry", function(event) {
		var content = $.trim($("#new-entry-form-content").val());
		console.log('preview')
		console.log(marked(content));
		// create a new
	});

	$('#new-entry').click(function(event) {
		var source   = $("#new-entry-template").html();
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

	function getS3Objects(callback) {
		var params = {
		  	Bucket: DATA_BUCKET,
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

	function getKeyContent(key) {

		var params = {
		  	Bucket: DATA_BUCKET,
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
			"Content-Type":  CONTENT_TYPE
		}

		var params = {
		  	Bucket: DATA_BUCKET,
		  	Key: key,
		  	Body: body,
		  	ContentType:  CONTENT_TYPE,
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
		var body = content.Body.toString();
		console.log(content);
		// check if the file is a markdown file, we dont wantt o load any images, etc
		var source   = $("#entry-template").html();
		var template = Handlebars.compile(source);
		var context = {
			title: content.Metadata['x-amz-meta-title'],
			modified: content.LastModified.toString(),
			// provide a link to the actual resource
			link: '',
			key: key,
			content: body
		};
		var html = template(context);
		$("#main").html(html);
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
        //         Bucket: ASSETS_BUCKET,
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