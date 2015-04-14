$(function() {
    
    var DATA_BUCKET = localStorage.getItem('dodgercms-data-bucket');
    var ASSETS_BUCKET = localStorage.getItem('dodgercms-assets-bucket');
    var ENCODING_TYPE = 'url';
    var API_VERSION = '2011-06-15';
    var CONTENT_TYPE = 'text/plain; charset=UTF-8';
    var S3_ENDPOINT = 's3.amazonaws.com';
    var ERROR_EXPIRED_TOKEN = 'ExpiredToken';

    // var ACCESS_KEY_ID = sessionStorage.getItem("lemonchop-AccessKeyId");
    // var SECRET_ACCESS_KEY sessionStorage.getItem("lemonchop-SecretAccessKey") || null;
    // var SESSION_TOKEN = sessionStorage.getItem("lemonchop-SessionToken") || null;


    Handlebars.registerHelper('selected', function(option, value) {
        return (option === value) ? ' selected="selected"' : '';
    });

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

        // keep track of how many requests were made
        var completed = 0;

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
                            completed+=1;
                            // add the Key attribute
                            data.Key = object.Key;
                            keys.push(data);
                            console.log(keys);
                            // When the requests have all finished
                            if (completed === contents.length) {
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

    listS3Objects(function(err, data) {
        var name = data.Name;
        var prefix = data.Prefix;
        var contents = data.Contents;

        var tree = [];

        // push the bucket
        tree.push({
            "id" : "s3-root", 
            "parent" : '#', 
            "text" : '<strong>' + DATA_BUCKET + '</strong>',
            "icon" : "fa fa-folder-o",
            "li_attr": {
                "data-dir": "/"
            },
            "state": {
                "opened": true
            }
        });



        headS3Objects(contents, function(err, data) {
            console.log(data);
            console.log('data ^^');


            // Loop through each object
            for (var i = 0; i < data.length; i+=1) {
                var object = data[i];
                var key = object.Key;

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

                    // if the last part in the key has a trailing slash or if the part 
                    // is in not the last elemenet it is a path
                    if ((j === parts.length-1 && key.substr(-1) === '/') || j !== parts.length-1) {
                        isDir = true;
                    }

                    console.log('parts',j, parts);


                    var search =  's3-' + ((j > 0) ? parts.slice(0,j+1).join("-") : parts[j]);
                    if (isDir) {
                        search += '-dir';
                    }
                    console.log('search', search);
                    
                    // Check to see if the id exists in the tree already
                    var result = $.grep(tree, function(e) { 
                        return e.id === search; 
                    });

                    



                    console.log('result', result);
                    // Only want to push a new node onto the tree if unique
                    if (result.length === 0) {
                        var parent = (j > 0) ? 's3-' + parts.slice(0,j).join("-") : 's3-root';
                        


                        if (parent !== 's3-root' && isDir) {
                            parent += '-dir';
                        }
                        console.log('parent=',parent);
                        var node = {
                            "id" : search, 
                            "parent" : parent, 
                            "text" : parts[j],
                            "icon" : (isDir) ? "fa fa-folder-o" : "fa fa-file-text-o",
                            "state": {
                                "opened": true
                            }
                        };
                        // Only key ojects need the data aatrivute
                        if (!isDir) {
                            
                            node.li_attr = {
                                "data-key": key
                            };
                            node.text = parts[j];                            
                            // if (object.Metadata["title"]) {
                            //     node.text = parts[j] + ' <span class="object-label">(' + object.Metadata["title"] + ')</span>';
                            //     node.li_attr["data-title"] = object.Metadata["title"];
                            // } else {
                            //     node.text = parts[j];
                            // }
                        } else {
                            
                            console.log('li_attr', j, parts)
                            node.li_attr = {
                                // the last slash is removed when splitting the key so it is readded here
                                "data-dir": (j > 0) ? parts.slice(0,j+1).join("/") + '/' : parts[j] + '/'
                            };

                            // The last part of the key will have the label
                            if (j === parts.length-1 && object.Metadata["label"]) {
                                node.text = parts[j] + ' <span class="object-label">(' + object.Metadata["label"] + ')</span>';
                                node.li_attr["data-label"] = object.Metadata["label"];
                            } else {
                                node.text = parts[j];
                            }
                        }

                        tree.push(node);
                    }


                }

                console.log('----------------');
            }

            var onTreeChange = function(event, data) {
                var action = data.action;

                switch (action) {
                    case "select_node":
                        var key = data.node.li_attr["data-key"];

                        // The key atribuete only exists on files, not folders
                        if (key) {
                            getKeyContent(key);
                        }
                        
                        break;
                } 
            }

            var customMenu = function(node) {


                // The default set of all items
                var items = {
                    editLabel: {},
                    newEntry: {
                        label: "New Entry",
                        action: function(elem) {
                            var dir = node.li_attr["data-dir"];
                            if (dir) {
                                newEntry(dir);
                            }
                        }
                    },
                    newFolder: {
                        label: "New Folder",
                        separator_after: true,
                        action: function(elem) {
                            var input = '';

                            // Don't let them pass without valid input
                            while (!/^([a-zA-Z0-9-_.]){3,32}$/.test(input)) {
                                // store the user input
                                input = window.prompt("Enter the name of the new folder.");
                                // The hit cancel
                                if (input === null) {
                                    return;
                                }
                            }

                            var dir = node.li_attr["data-dir"];
                            console.log(dir);
                            if (dir) {
                                newFolder(dir, input);
                            }
                        }
                    },
                    renameItem: {
                        label: "Rename",
                        action: function() {

                        }
                    },
                    deleteItem: {
                        label: "Delete",
                        action: function() {

                        }
                    }
                };

                // Folder
                var key = node.li_attr["data-key"];
                var dir = node.li_attr["data-dir"];
                if (key) {
                    items.newEntry._disabled = true;
                    items.newFolder._disabled = true;
                    delete items.editLabel;
                } else if (dir) {

                    var label = node.li_attr["data-label"];
                    var labelText = (label) ? 'Edit Label': 'Add Label';

                    items.editLabel = {
                        label: labelText,
                        separator_after: true,
                        action: function() {
                            var input, msg;

                            do {
                                msg = (label) ? "Enter the name of the new label for the directory: " + dir : "Enter the label (used for the frontend menu) for the directory: " + dir;
                                // store the user input
                                input = (label) ? window.prompt(msg, label) : window.prompt(msg);
                                // The hit cancel
                                if (input === null) {
                                    return;
                                }
                            } while(!/^([\w-_\.\s\(\)\/\\]){1,32}$/.test(input));

                            // Only update if different
                            if (input !== label) {
                                editLabel(input, dir);
                            }
                            
                        }
                    }
                }

                if (node.id === 's3-root') {
                    items.deleteItem._disabled = true;
                    items.renameItem._disabled = true;
                    items.editLabel._disabled = true;
                }
                return items;
            }

            // Render the jstree
            $('#tree')
            .on('changed.jstree', onTreeChange)
            .jstree({
                "core" : {
                    "check_callback": true,
                    "themes" : {
                        "dots" : true,
                        "name": 'proton',
                        "responsive": false
                    },
                    "animation" : false,
                    "data": tree
                },
                "plugins" : ["unique", "contextmenu"],
                "contextmenu": {
                    "items": customMenu,
                    "select_node": false
                }
            });
        });

    
    });
    //registerEventhandlers();

    $(document).bind('keydown', function(e) {
      // if (e.ctrlKey && (e.which == 83)) {
      //   e.preventDefault();
      //   save();
      // }
    });



    // A new entry is submitted
    $(document).on("submit", "#entry-form", function(event) {
        event.preventDefault();

        console.log('wtf');
        var title = $.trim($("#entry-form-title").val());
        var slug = $.trim($("#entry-form-slug").val());
        var content = $.trim($("#entry-form-content").val());
        var dir = $("#new-entry-form-dir option:selected" ).data('dir');

        // The title cannot be empty
        if (!title.length || title.length > 64) {
            alert("The title can not be empty.");
            return;
        }

        // the title needs to be between 1 and 32 characters
        if (!/^([a-zA-Z0-9-_\.]){3,32}$/.test(slug)) {
            alert("The url slug must be at least 3 characters and can only contain letters, numbers, dashes, underscores and periods.");
            return;
        }


        console.log(dir);

        var key = (dir !== '/') ? dir + slug : slug;
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
                "title": title,
            }
        };
        s3.putObject(params, function(err, data) {
            if (err) {

            } else {
                console.log(data);
            }
        });
    });

    $(document).on("click", "#edit-entry", function(event) {
        var key = $(this).data("key");

        if (typeof key === "undefined") {
            return;
        }

        getS3Object(key, function(err, data) {
            var body = data.Body.toString();

            // check if the file is a markdown file, we dont wantt o load any images, etc
            var source = $("#edit-entry-template").html();
            var template = Handlebars.compile(source);
            var modified = new Date(data.LastModified);

            // TODO: cache the objects from list
            listS3Objects(function(err, list) {
                if (err) {
                    // soemting
                } else {
                    var dirs = getDirs(list.Contents);
                    var slug = getSlug(key);
                    var context = {
                        title: data.Metadata['title'],
                        modified: modified.toLocaleString(),
                        key: key,
                        dirs: dirs,
                        slug: slug,
                        content: body
                    };
                    var html = template(context);
                    $("#main").html(html);
                }
            });


        });
    });

    $(document).on("change", "#upload-image", function(event) {

        var file = $("#upload-image")[0].files[0];
        var content = $('#entry-form-content');

        var types = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif'];
        console.dir(file);
        if (file) {
            // only images
            if (types.indexOf(file.type) < 0) {
                alert('Only images can be uploaded.');
                return;
            }
            // repalce any illegal characters from the filename
            var filename = 'images/' + file.name.replace(/\s|\\|\/|\(|\)/g,"-");
            var link = 'http://' + ASSETS_BUCKET + '.' + S3_ENDPOINT + '/' + filename;
            var params = {
                Bucket: ASSETS_BUCKET,
                Key: filename, 
                ContentType: file.type, 
                Body: file
            };

            // only upload if editing
            if (content.length > 0 && content.is(':visible')) {
                s3.upload(params, function(err, data) {
                    if (err) {
                        console.dir(err);
                    } else {
                        // Insert the markdown with the correct link into the document
                        var cursorPosStart = content.prop('selectionStart');
                        var cursorPosEnd = content.prop('selectionEnd');
                        var v = content.val();
                        var textBefore = v.substring(0,  cursorPosStart );
                        var textAfter = v.substring( cursorPosEnd, v.length );
                        content.val(textBefore + '![' + file.name + ']' + '(' + link + ')' + textAfter);
                    }
                });
            }
        }
    });

    $(document).on("click", "#preview-entry", function(event) {

        // the content-preview div exists only if in preview mode
        var preview = $('#content-preview');
        // the textarea
        var content = $('#entry-form-content');

        // if the content is already being previewed, display the editor again
        if (preview.length > 0) {
            // remove the preview contented and show the editor
            preview.remove();
            content.show();
            $(this).text('Preview');
        } else {
            var md = content.val();
            var html = '<div id="content-preview">' + marked(md) + '</div>';

            // hide the textarea
            content.hide();

            // append the markdown to the container
            $("#content-body-container").append(html);

            // highlight the code
            $('#content-preview pre code').each(function(i, block) {
                hljs.highlightBlock(block);
            });

            $(this).text('Write');
        }

    });

    // The directory is null if the "New Entry" button is used,
    // but if the user right clicks in the tree this should be populated
    function newEntry(dir) {
        var source   = $("#new-entry-template").html();
        var template = Handlebars.compile(source);

        listS3Objects(function(err, data) {
            if (err) {
                // TODO: handle error
            } else {
                var name = data.Name;
                var prefix = data.Prefix;
                var contents = data.Contents;
                var dirs = getDirs(contents);

                var context = {
                    dirs: dirs,
                    selectedDir: (typeof dir !== 'undefined') ? dir : null
                };
                var html = template(context);
                $("#main").html(html);
            }
        });
    }

    function newFolder(currentDir, newDir) {
        console.log(currentDir, newDir);
        // create a new dir key
        var key = (currentDir === '/') ? newDir + '/' : currentDir + newDir + '/';
        var params = {
            Bucket: DATA_BUCKET,
            Key: key
        };

        s3.putObject(params, function(err, data) {
            if (err) {
                console.log(err, err.stack);
            } else {
                console.log(data)
                // regenerate the tree
            }
        });
    }

    function editLabel(label, dir) {
        console.log(label, dir);

        var params = {
            Bucket: DATA_BUCKET,
            Key: dir,
            Metadata: {
                "label": label,
            }
        };

        s3.putObject(params, function(err, data) {
            if (err) {
                console.log(err, err.stack);
            } else {
                console.log(data)
                tree.jstree("refresh");
            }
        });


    }

    $('#new-entry').click(function(event) {
        newEntry(null);
    });

    function getSlug(key) {
        parts = key.split('/');
        return parts.pop();
    }

    function getDirs(objects) {
        var dirs = [];

        // push the root of the folder
        dirs.push('/');

        for (var i = 0; i < objects.length; i+=1) {
            var key = objects[i].Key;

            // only want directories
            if (key.substr(-1) === '/') {
                dirs.push(key);
            }
            
        }

        return dirs;
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

    function listS3Objects(callback) {
        var params = {
            Bucket: DATA_BUCKET,
            EncodingType: ENCODING_TYPE,
            MaxKeys: 1000,
        };

        s3.listObjects(params, function(err, data) {
            if (err) {
                if (err.code === ERROR_EXPIRED_TOKEN) {
                    dodgercms.auth.login(function(err) {

                    });
                }
                // show the login if credentials ar expired or incorrect
            } else {
                callback(null, data)
            }
        });
    }

    function getS3Object(key, callback) {
        var params = {
            Bucket: DATA_BUCKET,
            Key: key
        };

        s3.getObject(params, function(err, data) {
            if (err) {
                callbuck(err);
            } else {
                callback(null, data);
                
            }
        });
    }

    function getKeyContent(key, callback) {

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
        var modified = new Date(content.LastModified);

        console.log(marked(body));

        var context = {
            title: content.Metadata['title'],
            modified: modified.toLocaleString(),
            // provide a link to the actual resource
            link: '',
            key: key,
            content: marked(body)
        };
        var html = template(context);
        $("#main").html(html);
    }

});