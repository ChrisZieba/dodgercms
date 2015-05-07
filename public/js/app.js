/**
 * App
 *
 * This source code is licensed under the MIT-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Author: Chris Zieba (zieba.chris@gmail.com)
*/

/* global dodgercms: true */

$(function() {
  'use strict';

  var DATA_BUCKET = localStorage.getItem('dodgercms-data-bucket');
  var ASSETS_BUCKET = localStorage.getItem('dodgercms-assets-bucket');
  var SITE_BUCKET = localStorage.getItem('dodgercms-site-bucket');
  var SITE_ENDPOINT = localStorage.getItem('dodgercms-site-endpoint');
  var CONTENT_TYPE = 'text/plain; charset=UTF-8';
  var S3_ENDPOINT = 's3.amazonaws.com';

  // Options for the markdown converter
  var markedOptions = {
    renderer: new marked.Renderer(),
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: true,
    smartLists: true,
    smartypants: true,
    highlight: function(code) {
      return hljs.highlightAuto(code).value;
    }
  };

  Handlebars.registerHelper('selected', function(option, value) {
    return (option === value) ? ' selected="selected"' : '';
  });

  Handlebars.registerHelper('raw-helper', function(options) {
    return options.fn();
  });

  $(document).on('click', '.pure-button', function() {
    // Removes focus of the button
    $(this).blur();
  });

  // Pass the credentials to an s3 object
  s3init(false);

  // Pulls a list of all files from s3 and builds a tree
  buildTree();

  /**
   * Sets up the connection to S3.
   *
   * @param {Object} err The error object from the response
  */
  function s3init(force) {
    var accessKeyId = sessionStorage.getItem('dodgercms-token-access-key-id');
    var secretAccessKey = sessionStorage.getItem('dodgercms-token-secret-access-key');
    var sessionToken = sessionStorage.getItem('dodgercms-token-session-token');

    // init the s3 connection and pass in an error handler
    dodgercms.s3.init(accessKeyId, secretAccessKey, sessionToken, force);
  }

  /**
   * Handles errors throughout the application.
   *
   * @param {Object} err The error object from the response
  */
  function errorHandler(err) {
    var code = err.code;

    // Check if the token is expired
    if (code === 'ExpiredToken') {
      // Display a message and prevent any page interaction
      $.blockUI();

      // Checks if there are enough credentials saved (local storage) to login.
      // If a login is not possible, the user is redirected to the login page.
      dodgercms.auth.login(function(err, data) {
        // Remove the page blocker
        $.unblockUI();
        if (err) {
          // Redirect to the login page
          dodgercms.auth.redirect();
        } else {
          s3init(true);
          rebuildTree();
        }
      });
    }

    // TODO: handle other errors
  }

  /**
   * Recreates the jsTree tre structure.
  */
  function rebuildTree() {
    // Remove the old tree
    $('#tree').jstree('destroy');
    $('#list').empty().html('<div id="tree" class="tree""></div>');
    buildTree();
  }

  function buildTree() {
    dodgercms.s3.listObjects(DATA_BUCKET, function(err, data) {
      if (err) {
        errorHandler(err);
      } else {
        dodgercms.s3.headObjects(data.Contents, DATA_BUCKET, function(err, data) {
          var $tree = $('#tree');
          var tree = [];

          // Push the bucket onto the array as the root
          tree.push({
            'id': 's3--root', 
            'parent': '#', 
            'text': '<span class="bucket">' + DATA_BUCKET + '</span>',
            'type': 'folder', 
            'a_attr': {
              'title': DATA_BUCKET
            },
            'li_attr': {
              'data-key': '/'
            },
            'state': {
              'opened': true
            }
          });

          // Used when searching the tree for an id
          var searchFn = function(e) {
            return e.id === search;
          };

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

            // Split and remove last slash for directory
            var parts = key.replace(/\/\s*$/, '').split('/');

            for (var j = 0; j < parts.length; j+=1) {
              var isFolder = false;

              // If the last part in the key has a trailing slash or if the part 
              // is in not the last element it is a path
              if ((j === parts.length-1 && key.substr(-1) === '/') || j !== parts.length-1) {
                isFolder = true;
              }


              var search =  's3-' + ((j > 0) ? parts.slice(0,j+1).join('-') : parts[j]);

              // Need to prepend folder so confusion between file with the same name as folder is avoided
              if (isFolder) {
                search += '-folder';
              }
              
              // Check to see if the id exists in the tree already
              var result = $.grep(tree, searchFn);

              // Only want to push a new node onto the tree if unique
              if (result.length) {

                // add the label if it wasnt already
                if ((parts.slice(0, j+1).join('/')  === parts.join('/')) && object.Metadata.label) {
                  result[0].li_attr['data-label'] = object.Metadata.label;
                }

              } else {
                var parent = (j > 0) ? 's3-' + parts.slice(0,j).join('-') : 's3--root';
                
                if (parent !== 's3--root') {
                  parent += '-folder';
                }

                var node = {
                  'id' : search, 
                  'parent' : parent, 
                  'text' : parts[j],
                  'type': (isFolder) ? 'folder' : 'file',
                  'a_attr': {},
                  'state': {
                    'opened': true
                  }
                };

                // Only key ojects need the data aatrivute
                if (isFolder) {
                  node.li_attr = {
                    'data-key': (j > 0) ? parts.slice(0,j+1).join('/') + '/' : parts[j] + '/'
                  };

                  // The last part of the key will have the label
                  if ((parts.slice(0,j+1).join('/')  === parts.join('/')) && object.Metadata.label) {
                    node.li_attr['data-label'] = object.Metadata.label;
                    node.a_attr.title = object.Metadata.label;
                  } 

                } else {
                  // The last part of the key will have the title
                  if ((parts.slice(0,j+1).join('/')  === parts.join('/')) && object.Metadata.title) {
                    node.a_attr.title = object.Metadata.title;
                  } 

                  if (parts[j] === 'index') {
                    //node.text = '<span class=index-key>' + parts[j] + '</span>';
                    node.type = 'index';
                  }

                  node.li_attr = {
                    'data-key': key
                  };
                }

                tree.push(node);
              }
            }
          }

          var onTreeChange = function(event, data) {
            var action = data.action;

            switch (action) {
              case 'select_node':
                // The key atribuete only exists on files, not folders
                if (data.node.type !== 'folder') {
                  var key = data.node.li_attr['data-key'];
                  getKeyContent(key);
                  $('#main').data('key', key);
                }
                
                break;
            } 
          };

          var customMenu = function(node) {
            var newFolder = function(elem) {
              var input = '';
              var key = node.li_attr['data-key'];

              // Don't let them pass without valid input
              while (!/^([a-zA-Z0-9-_]){1,32}$/.test(input)) {
                // store the user input
                input = window.prompt('Enter the name of the new folder.');
                // The hit cancel
                if (input === null) {
                  return;
                } else {
                  input = input.toLowerCase();
                }
              }

              if (node.type === 'folder') {
                var newKey = (key === '/') ? input + '/' : key + input + '/';

                dodgercms.utils.newFolder(newKey, DATA_BUCKET, SITE_BUCKET, function(err, data) {
                  addNode(newKey, key, input);
                });
              }
            };

            var renameItem = function(elem) {
              var key = node.li_attr['data-key'];

              // remove the last slash if present
              var parts = key.replace(/\/\s*$/, '').split('/');
              var last = parts[parts.length-1];
              var input = last;
              var msg;

              do {
                msg = (node.type === 'folder') ? 'Enter the new name for folder: ' + input : 'Enter the new name for entry: ' + input;

                // store the user input
                input = window.prompt(msg, input);

                // They hit cancel, treat empty string as invalid
                if (input === null) {
                  return;
                } else {
                  input = input.toLowerCase();
                }
              } while (!/^([a-zA-Z0-9-_]){1,32}$/.test(input));

              // Only update if different
              if (input !== last) {
                block();

                // default to the user input
                var target = input;

                // if the key is a folder we need to pass in the input because many keys will need to change
                if (node.type !== 'folder') {
                  // replace the last element with the user input
                  parts.splice(-1, 1, input);

                  target = parts.join('/');
                } 


                dodgercms.entry.rename(key, target, DATA_BUCKET, SITE_BUCKET, function(err, data) {
                  unblock();
                  if (err) {
                    errorHandler(err);
                  } else {
                    dodgercms.entry.menu(SITE_BUCKET, SITE_ENDPOINT, function(err) {
                      if (err) {
                        errorHandler(err);
                      } else {
                        rebuildTree();
                        $('#main').data('key', key);
                      }
                    });
                  }
                });
              }
            };

            var editLabel = function(elem) {
              var label = node.li_attr['data-label'];
              var key = node.li_attr['data-key'];
              var input, msg;

              do {
                msg = (label) ? 'Enter the name of the new label for the directory: ' + key : 'Enter the label (used for the frontend menu) for the directory: ' + key;

                // store the user input
                input = (label) ? window.prompt(msg, label) : window.prompt(msg);

                // The hit cancel
                if (input === null) {
                  return;
                }
              } while(!/^([\w-_\.\s\(\)\/\\]){1,32}$/.test(input));

              // Only update if different
              if (input !== label) {
                var params = {
                  Bucket: DATA_BUCKET,
                  Key: key,
                  Metadata: {
                    'label': input,
                  }
                };

                dodgercms.s3.putObject(params, function(err, data) {
                  if (err) {
                    errorHandler(err);
                  } else {
                    // Update the bucket
                    params.Bucket = SITE_BUCKET;
                    dodgercms.s3.putObject(params, function(err, data) {
                      if (err) {
                        errorHandler(err);
                      }
                    });
                  }
                });
              }
            };


            var editItem = function(elem) {
              var key = node.li_attr['data-key'];
              editEntry(key);
            };

            var removeItem = function(elem) {
              var input = window.confirm('Are you sure?');
              if (input === null) {
                return;
              }
              var key = node.li_attr['data-key'];

              dodgercms.entry.remove(key, DATA_BUCKET, SITE_BUCKET, function(err, data) {
                if (err) {
                  errorHandler(err);
                } else {
                  dodgercms.entry.menu(SITE_BUCKET, SITE_ENDPOINT, function(err) {
                    // remove from the tree
                    clearEntry(key);
                    $tree.jstree('delete_node', '#' + node.id);
                  });
                }
              });
            };

            var newItem = function(elem) {
              var key = node.li_attr['data-key'];
              if (node.type === 'folder') {
                newEntry(key);
              }
            };

            // The default set of all items
            var items = {
              editLabel: {},
              newEntry: {
                label: 'New Entry',
                action: newItem
              },
              editEntry: {
                label: 'Edit',
                action: editItem
              },
              newFolder: {
                label: 'New Folder',
                separator_after: true,
                action: newFolder
              },
              renameItem: {
                label: 'Rename',
                action: renameItem
              },
              removeItem: {
                label: 'Delete',
                action: removeItem
              }
            };
            
            if (node.type === 'folder') {
              var label = node.li_attr['data-label'];
              var labelText = (label) ? 'Edit Label': 'Add Label';

              items.editLabel = {
                label: labelText,
                separator_after: true,
                action: editLabel
              };
              delete items.editEntry;
            } else {
              items.newEntry._disabled = true;
              items.newFolder._disabled = true;
              delete items.editLabel;
            }

            if (node.id === 's3--root') {
              items.removeItem._disabled = true;
              items.renameItem._disabled = true;
              items.editLabel._disabled = true;
            }

            return items;
          };

          // Render the jstree
          $tree.on('changed.jstree', onTreeChange)
          .jstree({
            'core' : {
              'check_callback': true,
              'themes' : {
                'dots' : true,
                'name': 'proton',
                'responsive': false
              },
              'animation' : false,
              'data': tree
            },
            'types' : {
              'default' : {
                'icon' : 'fa'
              },
              'file' : {
                'icon' : 'fa fa-file-text-o'
              },
              'index' : {
                'icon' : 'fa fa-asterisk'
              },
              'folder' : {
                'icon' : 'fa fa-folder-o',
                'select_node': false
              }
            },
            'plugins' : ['unique', 'contextmenu', 'sort', 'ui', 'types'],
            'contextmenu': {
              'items': customMenu,
              'select_node': false
            },
            'sort': function(a, b) {
              var nodeA = this.get_node(a);
              var nodeB = this.get_node(b);

              // move index files to the top

              if (nodeA.type === nodeB.type) {
                // If the types are the same, sort by name
                return this.get_text(a) > this.get_text(b) ? 1 : -1; 
              } else {
                if (nodeA.type === 'index') {
                  return -1;
                } else if (nodeB.type === 'index') {
                  return 1;
                } else {
                  return nodeA.type === 'file' ? 1 : -1; 
                }
              }
            }
          });
        });
      }
    });
  }

  $(document).bind('keydown', function(event) {
    if (event.ctrlKey && (event.which == 83)) {
      // check if there is an entry loaded
      if ($('#entry-form').is(':visible')) {
        save(event);
      }
    }
  });

  function isFolder(key) {
    return (key.substr(-1) === '/') ? true : false;
  }

  function doesTreeNodeExist(id) {
    if ($('#tree').jstree('get_node', id)) {
      return true;
    }

    return false;
  }

  function addNode(key, parent, text, title) {
    var folder = isFolder(key);
    var id = getTreeNodeId(key);
    parent = getTreeNodeId(parent);

    var node = {
      'id' : id, 
      'parent' : parent, 
      'text' : text,
      'type': (folder) ? 'folder' : 'file',
      'li_attr': {
        'data-key': key
      },
      'state': {
        'opened': true
      }
    };

    if (text === 'index') {
      node.type = text;
    }

    if (title) {
      node.a_attr = {
        'title': title
      };
    }

    // Only add the node to the tree if it doesnt exist
    if (!doesTreeNodeExist(id)) {
      $('#tree').jstree('create_node', '#' + parent, node);
    }
    
    return node;
  }

  function block() {
    // block the page
    $.blockUI({ 
      css: { 
        'border': 'none',
        'padding': '15px',
        'backgroundColor': '#000',
        '-webkit-border-radius': '10px',
        '-moz-border-radius': '10px',
        'opacity': 0.5,
        'color': '#fff'
      },
      // styles for the overlay 
      overlayCSS:  { 
        'backgroundColor': '#000', 
        'opacity': 0, 
        'cursor': 'wait' 
      }
    }); 
  }

  function unblock() {
    $.unblockUI();
  }

  function save(event) {
    event.preventDefault();
    
    var $title = $('#entry-form-title');
    var $folder = $('#entry-form-folder');
    var $slug = $('#entry-form-slug');
    var $content = $('#entry-form-content');

    var title = $.trim($title.val());
    var folder = $('option:selected', $folder).data('folder');
    var slug = $.trim($slug.val()).toLowerCase();
    var content = $.trim($content.val());

    // The title cannot be empty
    if (!title.length || title.length > 64) {
      alert('The title needs to be between 1 and 64 characters.');
      return;
    }

    // the slug needs to be between 1 and 32 characters
    if (!/^([a-zA-Z0-9-_]){1,32}$/.test(slug)) {
      alert('The url slug must be at most 32 characters, and can only contain letters, numbers, dashes, underscores.');
      return;
    }

    block();

    var callback = function(key, folder, slug, title) {
      // Update the key
      $('#main').data('key', key);

      // add the node to the tree (only added if it doesnt exist)
      addNode(key, folder, slug, title);
      
      // update the data attributes
      $slug.attr('data-entry-form-slug', slug);
      $slug.data('entry-form-slug', slug);
      $slug.val(slug);
      $folder.attr('data-entry-form-folder', folder);
      $folder.data('entry-form-folder', folder);

      // Process the entry
      dodgercms.entry.upsert(key, title, content, SITE_BUCKET, SITE_ENDPOINT, function(err, data) {
        if (err) {
          errorHandler(err);
        } else {
          dodgercms.entry.menu(SITE_BUCKET, SITE_ENDPOINT, function() {
            unblock();
          });
        }
      });
    };

    // Check for the root folder
    var key = (folder !== '/') ? folder + slug : slug;

    var $folderData = $folder.data('entry-form-folder');
    var $slugData = $slug.data('entry-form-slug');

    // If the folder or slug has changed we need to move the object. The reason for checking
    // if the slugData exists is to determine if the entry exists already (i.e, not new).
    if ($slugData && $folderData && (($folderData !== folder) || ($slugData !== slug))) {

      // This is the where the entry was originally located before the save
      var oldKey = ($folderData !== '/') ? $folderData + $slugData : $slugData;

      dodgercms.entry.rename(oldKey, key, DATA_BUCKET, SITE_BUCKET, function(err, data) {
        if (err) {
          errorHandler(err);
        } else {
          $('#tree').jstree('delete_node', '#' + getTreeNodeId(oldKey));
          callback(key, folder, slug, title);
        }
      });
    } else {
      // Create the new key in s3
      var params = {
        Bucket: DATA_BUCKET,
        Key: key,
        Body: content,
        ContentEncoding: 'utf-8',
        ContentType:  CONTENT_TYPE,
        Expires: 0,
        CacheControl: 'public, max-age=0, no-cache',
        Metadata: {
          'title': title,
        }
      };

      // Put the object in its place
      dodgercms.s3.putObject(params, function(err, data) {
        callback(key, folder, slug, title);
      });
    }
  }

  // A new entry is submitted or saved
  $(document).on('submit', '#entry-form', save);

  $(document).on('click', '#edit-entry', function(event) {
    var key = $(this).data('key');

    if (typeof key === 'undefined') {
      return;
    } else {
      editEntry(key);
    }
  });

  function editEntry(key) {
    dodgercms.s3.getObject(key, DATA_BUCKET, function(err, data) {
      var body = data.Body.toString();
      var source = $('#edit-entry-template').html();
      var template = Handlebars.compile(source);
      var modified = new Date(data.LastModified);

      // TODO: cache the objects from list
      dodgercms.s3.listObjects(DATA_BUCKET, function(err, list) {
        if (err) {
          errorHandler(err);
        } else {
          var folders = dodgercms.utils.getFolders(list.Contents);
          var slug = getSlug(key);
          var selectedFolder = (key.indexOf('/') > -1) ? key.substr(0, key.lastIndexOf('/') + 1) : '/';

          var context = {
            title: data.Metadata.title,
            modified: modified.toLocaleString(),
            key: key,
            folders: folders,
            selectedFolder: selectedFolder,
            slug: slug,
            content: body
          };

          var html = template(context);
          $('#main').html(html);
        }
      });
    });
  }

  $(document).on('click', '#delete-entry', function(event) {
    var key = $(this).data('key');

    if (typeof key === 'undefined') {
      return;
    }

    if (!window.confirm('Are you sure?')) {
      return;
    }

    dodgercms.entry.remove(key, DATA_BUCKET, SITE_BUCKET, function(err, data) {
      if (err) {
        errorHandler(err);
      } else {
        dodgercms.entry.menu(SITE_BUCKET, SITE_ENDPOINT, function() {
          // remove from the tree
          $('#tree').jstree('delete_node', '#' + getTreeNodeId(key));
          clearEntry(key);
        });
      }
    });
  });

  $(document).on('click', '#close-entry', function(event) {
    var key = $('#main').data('key');
    if (key && key !== '/') {
      getKeyContent(key);
    } else {
      clearEntry(key);
    }
  });

  function clearEntry(key) {
    if (key === $('#main').data('key')) {
      $('#main').empty().data('key', null);
    }
  }

  function getTreeNodeId(key) {
    if (key === '/') {
      return 's3--root';
    }

    // remove the last slash
    var parts = key.replace(/\/\s*$/, '').split('/');
    var prefix = 's3-';
    var folderSuffix = '-folder';
    var id;

    if (isFolder(key)) {
      id = prefix + parts.join('-') + folderSuffix;
    } else {
      id = prefix + parts.join('-');
    }

    return id;
  }

  $(document).on('change', '#upload-image', function(event) {

    var file = $('#upload-image')[0].files[0];
    var content = $('#entry-form-content');
    var types = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif'];

    if (!file || types.indexOf(file.type) < 0) {
      alert('Only images can be uploaded.');
      return;
    }

    // only upload if editing
    if (content.length <= 0 || !content.is(':visible')) {
      return;
    }

    // replace any illegal characters from the filename
    var filename = 'images/' + file.name.replace(/\s|\\|\/|\(|\)/g,'-');

    var link = 'http://' + ASSETS_BUCKET + '.' + S3_ENDPOINT + '/' + filename;
    var params = {
      Bucket: ASSETS_BUCKET,
      Key: filename, 
      ContentType: file.type, 
      Body: file
    };

    dodgercms.s3.upload(params, function(err, data) {
      if (err) {
        errorHandler(err);
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
  });

  $(document).on('click', '#preview-entry', function(event) {

    // the content-preview div exists only if in preview mode
    var preview = $('#content-preview');
    // the textarea
    var content = $('#entry-form-content');

    // if the content is already being previewed, display the editor again
    if (preview.length > 0) {
      // remove the preview content and show the editor
      preview.remove();
      content.show();
      $(this).html('<i class="fa fa-search"></i>');
      $(this).prop('title', 'Preview');
      $('label[for=upload-image]').removeClass('none');
    } else {
      var md = content.val();
      var html = '<div id="content-preview">' + marked(md, markedOptions) + '</div>';

      // hide the textarea
      content.hide();

      // append the markdown to the container
      $('#content-body-container').append(html);

      // highlight the code
      $('#content-preview pre code').each(function(i, block) {
        hljs.highlightBlock(block);
      });

      $(this).html('<i class="fa fa-pencil"></i>');
      $(this).prop('title', 'Write');

      // remove the upload image icon
      $('label[for=upload-image]').addClass('none');
    }
  });

  $('#new-entry').click(function(event) {
    newEntry(null);
  });

  function newEntry(folder) {
    dodgercms.s3.listObjects(DATA_BUCKET, function(err, data) {
      if (err) {
        errorHandler(err);
      } else {
        var folders = dodgercms.utils.getFolders(data.Contents);

        var context = {
          folders: folders,
          selectedFolder: (folder) ? folder : null
        };
        var source = $('#edit-entry-template').html();
        var template = Handlebars.compile(source);
        var html = template(context);
        $('#main').html(html);
      }
    });
  }

  function getSlug(key) {
    var parts = key.split('/');
    return parts.pop();
  }

  function getKeyContent(key, callback) {
    dodgercms.s3.getObject(key, DATA_BUCKET, function(err, data) {
      if (err) {
        errorHandler(err);
      } else {
        loadKeyContent(key, data);
      }
    });
  }

  function loadKeyContent(key, content) {
    //var allowedContentTypes = ['application/'];
    var body = content.Body.toString();

    // check if the file is a markdown file, we dont wantt o load any images, etc
    var source   = $('#entry-template').html();
    var template = Handlebars.compile(source);
    var modified = new Date(content.LastModified);

    var context = {
      title: content.Metadata.title,
      modified: modified.toLocaleString(),
      // TODO: provide a link to the actual resource
      link: '',
      key: key,
      content: marked(body, markedOptions)
    };

    var html = template(context);
    $('#main').html(html).data('key', key);

    // highlight the code
    $('#main .content-body pre code').each(function(i, block) {
      hljs.highlightBlock(block);
    });
  }
});