/**
 * Main application components.
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
    sanitize: false,
    smartLists: true,
    smartypants: false,
    highlight: function(code) {
      return hljs.highlightAuto(code).value;
    }
  };

  Handlebars.registerHelper('selected', function(option, value) {
    return (option === value) ? ' selected="selected"' : '';
  });

  // Helper to prevent blocks of template code from getting rendered
  Handlebars.registerHelper('raw-helper', function(options) {
    return options.fn();
  });

  // Setup connection to S3
  s3init(false);

  // Pulls a list of all files from s3 and builds a tree
  buildTree();

  /**
   * Sets up the connection to S3.
   *
   * @param {Object} force Flag to force the regeneration of the s3 object
  */
  function s3init(force) {
    var accessKeyId = sessionStorage.getItem('dodgercms-token-access-key-id');
    var secretAccessKey = sessionStorage.getItem('dodgercms-token-secret-access-key');
    var sessionToken = sessionStorage.getItem('dodgercms-token-session-token');

    if (!accessKeyId || !secretAccessKey || !sessionToken) {
      dodgercms.auth.redirect();
    }

    // Init the s3 connection
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
      block();

      // Checks if there are enough credentials saved (local storage) to login.
      // If a login is not possible, the user is redirected to the login page.
      dodgercms.auth.login(function(err, data) {
        // Remove the page blocker
        unblock();

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
   * Recreates the jsTree tree structure.
  */
  function rebuildTree() {
    // Remove the old tree
    $('#tree').jstree('destroy');
    $('#list').empty().html('<div id="tree" class="tree""></div>');
    buildTree();
  }

  /**
   * Build a jsTree tree structure.
  */
  function buildTree() {
    // Get all the key objects from the bucket
    dodgercms.s3.listObjects(DATA_BUCKET, function(err, data) {
      if (err) {
        errorHandler(err);
      } else {
        // Need the meta information for each object
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

          // Loop through each key object from S3
          for (var i = 0; i < data.length; i+=1) {
            var object = data[i];
            var key = object.Key;

            // Anything other than a directory or text/plain (markdown) will be ignored
            if (key.substr(-1) !== '/') {
              if (object.ContentType !== CONTENT_TYPE) {
                continue;
              }
            }

            // Split into folder parts and remove last slash (if exists)
            var parts = key.replace(/\/\s*$/, '').split('/');
            for (var j = 0; j < parts.length; j+=1) {
              var isFolder = false;

              // If the last part in the key has a trailing slash or if the part
              // is in not the last element it is a path
              if ((j === parts.length-1 && key.substr(-1) === '/') || j !== parts.length-1) {
                isFolder = true;
              }

              // The search id used by jsTree
              var search =  's3-' + ((j > 0) ? parts.slice(0,j+1).join('-') : parts[j]);

              // Need to prepend '-folder' so confusion between files with the same name as folders is avoided
              if (isFolder) {
                search += '-folder';
              }

              // Check to see if the id exists in the tree already
              var result = $.grep(tree, searchFn);

              // Only want to push a new node onto the tree if unique
              if (result.length) {
                // add the label if it wasn't already
                if ((parts.slice(0, j+1).join('/')  === parts.join('/')) && object.Metadata.label) {
                  result[0].li_attr['data-label'] = object.Metadata.label;
                  result[0].a_attr.title = object.Metadata.label;
                }
              } else {
                var parent = (j > 0) ? 's3-' + parts.slice(0,j).join('-') : 's3--root';
                if (parent !== 's3--root') {
                  parent += '-folder';
                }

                // Tree node
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

                // Only key objects need the data attribute
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

          // Handle changes to the jsTree object
          var onTreeChange = function(event, data) {
            var action = data.action;

            switch (action) {
              case 'select_node':
                // The key atribuete only exists on files, not folders
                if (data.node.type !== 'folder') {
                  var key = data.node.li_attr['data-key'];
                  dodgercms.s3.getObject(key, DATA_BUCKET, function(err, data) {
                    if (err) {
                      errorHandler(err);
                    } else {
                      loadKeyContent(key, data);
                      $('#main').data('key', key);
                    }
                  });
                }

                break;
            }
          };

          // Custom drop down menu for nodes in the tree
          var customMenu = function(node) {
            var newFolder = function(elem) {
              var input = '';
              var key = node.li_attr['data-key'];

              // Keep prompting until valid input is given, or cancel is selected
              while (!/^([a-zA-Z0-9-_]){1,32}$/.test(input)) {
                // Store the user input
                input = window.prompt('Enter the name of the new folder.');
                // Cancel
                if (input === null) {
                  return;
                } else {
                  input = input.toLowerCase();
                }
              }

              // Folders can only be added to existing folders
              if (node.type === 'folder') {
                var newKey = (key === '/') ? input + '/' : key + input + '/';

                dodgercms.utils.newFolder(newKey, DATA_BUCKET, SITE_BUCKET, function(err, data) {
                  // Add the node to the tree on completion
                  addNode(newKey, key, input);
                });
              }
            };

            // Rename a file or folder
            var renameItem = function(elem) {
              var key = node.li_attr['data-key'];

              // Remove the last slash if it's present
              var parts = key.replace(/\/\s*$/, '').split('/');
              var last = parts[parts.length-1];
              var input = last;
              var msg;

              // Keep prompting until valid input is given, or cancel is selected
              do {
                msg = (node.type === 'folder') ? 'Enter the new name for folder: ' + input : 'Enter the new name for entry: ' + input;

                // Store the user input
                input = window.prompt(msg, input);

                // They hit cancel, treat empty string as invalid
                if (input === null) {
                  return;
                } else {
                  input = input.toLowerCase();
                }
              } while (!/^([a-zA-Z0-9-_]){1,32}$/.test(input));

              // Only update if the input is different
              if (input !== last) {
                // Prevent any further page interation until complete
                block();

                // Default to the user input
                var target = input;

                // If the key is a folder we need to pass in the input because many keys will need to change
                if (node.type !== 'folder') {
                  // Replace the last element with the user input
                  parts.splice(-1, 1, input);

                  // The new key name
                  target = parts.join('/');
                }

                // Rename the entry in S3
                dodgercms.entry.rename(key, target, DATA_BUCKET, SITE_BUCKET, function(err, data) {
                  // Remove the page blocker
                  unblock();
                  if (err) {
                    errorHandler(err);
                  } else {
                    // The menu needs to be regenerated
                    dodgercms.entry.menu(SITE_BUCKET, SITE_ENDPOINT, function(err) {
                      if (err) {
                        errorHandler(err);
                      } else {
                        // TODO: instead of rebuilding the tree, figure out which nodes need to change
                        rebuildTree();
                        $('#main').data('key', key);
                      }
                    });
                  }
                });
              }
            };

            // Edit a folder label
            var editLabel = function(elem) {
              var label = node.li_attr['data-label'];
              var key = node.li_attr['data-key'];
              var input;
              var msg;

              // Keep prompting until valid input is given, or cancel is selected
              do {
                msg = (label) ? 'Enter the name of the new label for the directory: ' + key : 'Enter the label (used for the frontend menu) for the directory: ' + key;

                // Store the user input
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
                    // Update the bucket to upload to
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

            // Link to edit the entry
            var editItem = function(elem) {
              var key = node.li_attr['data-key'];
              editEntry(key);
            };

            // Removes an entry from all buckets
            var removeItem = function(elem) {
               var key = node.li_attr['data-key'];
              var input = window.confirm('Are you sure?');
              if (input === null) {
                return;
              }

              // This will delete from S3
              dodgercms.entry.remove(key, DATA_BUCKET, SITE_BUCKET, function(err, data) {
                if (err) {
                  errorHandler(err);
                } else {
                  // Regenerate the menu
                  dodgercms.entry.menu(SITE_BUCKET, SITE_ENDPOINT, function(err) {
                    // remove from the tree
                    clearEntry(key);
                    $tree.jstree('delete_node', '#' + node.id);
                  });
                }
              });
            };

            // Add a new entry to the tree
            var newItem = function(elem) {
              var key = node.li_attr['data-key'];

              // Entries can only be added to folders
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

            // Folders get extra items added to the menu
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

            // The root node needs certain items deleted
            if (node.id === 's3--root') {
              items.removeItem._disabled = true;
              items.renameItem._disabled = true;
              items.editLabel._disabled = true;
            }

            return items;
          };

          // Render the jsTree
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

              // Move index files to the top
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

  /**
   * Checks if a jsTree node exists in the tree.
   *
   * @param {String} id The ID of the tree node
   * @return {Boolean}
  */
  function doesTreeNodeExist(id) {
    if ($('#tree').jstree('get_node', id)) {
      return true;
    }

    return false;
  }

  /**
   * Add a node (leaf) to the jsTree.
   *
   * @param {String} id The key name
   * @param {String} parent The parent folder
   * @param {String} text The text used in the tree node
   * @param {String} title The title of the entry
   * @return {Object} A new jsTree node
  */
  function addNode(key, parent, text, title) {
    var folder = dodgercms.utils.isFolder(key);
    var id = getTreeNodeId(key);

    // Get the ID of the parent node in the tree
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

  /**
   * Overlays a page blocking modal to prevent interation while
   * events in the background are still being processed.
  */
  function block() {
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
      // Styles for the overlay
      overlayCSS:  {
        'backgroundColor': '#000',
        'opacity': 0,
        'cursor': 'wait'
      }
    });
  }

  /**
   * Remove the page blocker.
  */
  function unblock() {
    $.unblockUI();
  }

  /**
   * Process multiple form entry inputs into a single HTML element
   */
  function processFormFields($content) {
    var content = '';
    $content.find('input, select, textarea').each(function(){
      var before = ($(this).data('before') ? $(this).data('before') : '');
      var after = ($(this).data('after') ? $(this).data('after') : '');

      if($(this).is(':radio') || $(this).is(':checkbox')){
        if($(this).is(':not(:checked)')){
          return;
        }
      }

      if($(this).val() !== ''){
        var cssclass = '';
        if($(this).data('class')){
          cssclass = ' class="'+$(this).data('class')+'"';
        }

        content += '<div id="' + $(this).attr('id') + '"'+cssclass+'>';
        if(before !== ''){
          content += '<span class="before">' + before + '</span>';
        }
        if($(this).data('wrapwith')){
          var nodes = $(this).data('wrapwith').split('><');
          if(nodes.length == 2){
            content += nodes[0] + '>' + $.trim($(this).val()) + '<' + nodes[1];
          }
          else {
            content += $.trim($(this).val());
          }
        }
        else {
          content += $.trim($(this).val());
        }

        if(after !== ''){
          content += '<span class="after">' + after + '</span>';
        }
        content +=  '</div>';
      }
    });
    return content;
  }

  function getMetadata(){
    var metadata = {};
    $('#document-editor .metadata').each(function(){
      metadata[$(this).attr('id')] = $(this).val();
    });
    return metadata;
  }


  /**
   * Save an entry.
   *
   * @param {Object} event The JavaScript event
  */
  function save(event) {
    event.preventDefault();

    // Get the form values
    var $title = $('#title');
    var $folder = $('#entry-form-folder');
    var $slug = $('#entry-form-slug');
    var $content = $('#content-body-container');

    var title = $.trim($title.val());
    var folder = $('option:selected', $folder).data('folder');
    var slug = $.trim($slug.val()).toLowerCase();
    var content = processFormFields($content);

    // The title cannot be empty
    if (!title.length || title.length > 64) {
      alert('The title needs to be between 1 and 64 characters.');
      return;
    }

    // The slug needs to be between 1 and 32 characters
    if (!/^([a-zA-Z0-9-_]){1,32}$/.test(slug)) {
      alert('The url slug must be at most 32 characters, and can only contain letters, numbers, dashes, underscores.');
      return;
    }
    // Block the page
    block();

    var metadata = getMetadata();

    // Callback used after the entry was uploaded to S3
    var callback = function(key, folder, slug) {
      // Update the key
      $('#main').data('key', key);

      // Add the node to the tree (only added if it doesnt exist)
      addNode(key, folder, slug, title);

      // Update the data attributes
      $slug.attr('data-entry-form-slug', slug);
      $slug.data('entry-form-slug', slug);
      $slug.val(slug);
      $folder.attr('data-entry-form-folder', folder);
      $folder.data('entry-form-folder', folder);
      var metadata = getMetadata();
      // Process the entry
      dodgercms.entry.upsert(key, metadata, content, SITE_BUCKET, SITE_ENDPOINT, function(err, data) {
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

    // If the folder or slug has changed we need to move the object. The
    // reason for checking if the slugData exists is to determine
    // if the entry exists already (i.e, not new).
    if ($slugData && $folderData && (($folderData !== folder) || ($slugData !== slug))) {
      // This is the where the entry was originally located before the save
      var oldKey = ($folderData !== '/') ? $folderData + $slugData : $slugData;

      dodgercms.entry.rename(oldKey, key, DATA_BUCKET, SITE_BUCKET, function(err, data) {
        if (err) {
          errorHandler(err);
        } else {
          $('#tree').jstree('delete_node', '#' + getTreeNodeId(oldKey));
          callback(key, folder, slug);
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
        Metadata: metadata
      };

      // Put the object in its place
      dodgercms.s3.putObject(params, function(err, data) {
        callback(key, folder, slug);
      });
    }
  }

  /**
   * Edit the entry.
   *
   * @param {String} key The key name
  */
  function editEntry(key) {
    // Gets the object data from S3
    dodgercms.s3.getObject(key, DATA_BUCKET, function(err, data) {
      var body = '';
      if(sessionStorage.getItem(data.ETag+'_'+key+'-Body')) {
        body = JSON.parse(sessionStorage.getItem(data.ETag+'_'+key+'-Body'));
      }
      else if(data.Body !== null){
        body = data.Body.toString();
      }
      var source = $('#edit-entry-template').html();
      var template = Handlebars.compile(source);
      var modified = new Date(data.LastModified);

      dodgercms.s3.listObjects(DATA_BUCKET, function(err, list) {
        if (err) {
          errorHandler(err);
        } else {
          var folders = dodgercms.utils.getFolders(list.Contents);
          var slug = dodgercms.utils.getSlug(key);
          var selectedFolder = (key.indexOf('/') > -1) ? key.substr(0, key.lastIndexOf('/') + 1) : '/';

          // Passed into the template
          var context = {
            title: data.Metadata.title,
            modified: modified.toLocaleString(),
            key: key,
            folders: folders,
            selectedFolder: selectedFolder,
            slug: slug,
            content: body,
            whichPartial: function(){
              return 'data-type-is-'+data.Metadata.datatype;
            }
          };

          // Render the template and load the contents into the page
          var html = template(context);
          $('#main').html(html);

          addTinyMCE();
          addDataTypeSelector(null);
          setVisibilitySelect(data.Metadata.visibility);
          addBeforeAfterText();
          //set the datatype selector to the document's datatype
          $('#datatype').val(data.Metadata.datatype);

          //set any select elements to their data-value attribute values
          $('#entry-form select').each(function(){
            if($(this).data('value')){
              $(this).val($(this).data('value'));
            }
          });

          //set the external link to the asset
          $('#view-entry').attr('href', SITE_ENDPOINT + $('#entry-form-folder').val() + $('#entry-form-slug').val());
        }
      });
    });
  }

  /**
   * Do an edit and save operation on the entry (used on a template update)
   *
   * @param {String} key The key name
  */
  function quickPublishEntry(item, callback) {    // Gets the object data from S3
    var key = item.Key;
    dodgercms.s3.getObject(key, DATA_BUCKET, function(err, data) {
      dodgercms.s3.listObjects(DATA_BUCKET, function(err, list) {
        if (err) {
          errorHandler(err);
        } else {
          // Process the entry
          var body = '';
          if(sessionStorage.getItem(data.ETag+'_'+key+'-Body')) {
            body = JSON.parse(sessionStorage.getItem(data.ETag+'_'+key+'-Body'));
          }
          else {
            body = data.Body.toString();
          }

          var metadata = getMetadata();

          dodgercms.entry.upsert(key, metadata, body, SITE_BUCKET, SITE_ENDPOINT, function(err, data) {
            if (err) {
              callback(err);
              errorHandler(err);
            }
            else {
              console.log('Updated', key);
              callback(null);
            }
          });
        }
      });
    });
  }

  /**
   * Clears an entry from the viewport.
   *
   * @param {String} key The key name
  */
  function clearEntry(key) {
    // Ignore if loaded key doesn't match what we're trying to clear
    if (key === $('#main').data('key')) {
      $('#main').empty().data('key', null);
    }
  }

  /**
   * Returns the jsTree ID of a node item.
   *
   * @param {String} id The key name
   * @return {String} The node ID
  */
  function getTreeNodeId(key) {
    if (key === '/') {
      return 's3--root';
    }

    // Remove the last slash
    var parts = key.replace(/\/\s*$/, '').split('/');
    var prefix = 's3-';
    var folderSuffix = '-folder';
    var id;

    // Add the folder suffix if needed
    if (dodgercms.utils.isFolder(key)) {
      id = prefix + parts.join('-') + folderSuffix;
    } else {
      id = prefix + parts.join('-');
    }

    return id;
  }

  /**
   * Creates a new entry in the system.
   *
   * @param {String} folder Where the entry will get placed
  */
  function newEntry(folder, datatype) {
    // The objects are needed so we can generate the folder dropd down
    dodgercms.s3.listObjects(DATA_BUCKET, function(err, data) {
      if (err) {
        errorHandler(err);
      } else {
        var folders = dodgercms.utils.getFolders(data.Contents);

        var context = {
          folders: folders,
          selectedFolder: (folder) ? folder : null,
          whichPartial: function(){
            return 'data-type-is-' + (datatype ? datatype : 'html');
          }
        };

        // Render the template and load its contents into the page
        var source = $('#edit-entry-template').html();
        var template = Handlebars.compile(source);
        var html = template(context);
        $('#main').html(html);

        addTinyMCE();
        addDataTypeSelector(datatype);
      }
    });
  }

  /**
   * Load entry content into the view.
   *
   * @param {String} key The key name
   * @param {String} content The key object from S3
  */
  function loadKeyContent(key, content) {
    removeTinyMCE();
    var body = '';
    if(sessionStorage.getItem(content.ETag+'_'+key+'-Body')) {
      body = JSON.parse(sessionStorage.getItem(content.ETag+'_'+key+'-Body'));
    }
    else if(content.Body !== null){
      body = content.Body.toString();
    }

    // Check if the file is a markdown file, we dont want to load any images, etc
    var source   = $('#entry-template').html();
    var template = Handlebars.compile(source);
    var modified = new Date(content.LastModified);

    var context = {
      title: content.Metadata.title,
      modified: modified.toLocaleString(),
      link: SITE_ENDPOINT+key,
      key: key,
      content: marked(body, markedOptions)
    };

    var html = template(context);
    $('#main').html(html).data('key', key);

    // Highlight any code blocks
    $('#main .content-body pre code').each(function(i, block) {
      hljs.highlightBlock(block);
    });
  }

  // Event listener for the delete entry button
  $(document).on('click', '#delete-entry', function(event) {
    var key = $(this).data('key');

    if (typeof key === 'undefined') {
      return;
    }

    if (!window.confirm('Are you sure?')) {
      return;
    }

    // Remove from S3
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

  // Event listenter for the close entry button
  $(document).on('click', '#close-entry', function(event) {
      removeTinyMCE();
      var key = $('#main').data('key');
      if (key && key !== '/') {
        dodgercms.s3.getObject(key, DATA_BUCKET, function(err, data) {
          if (err) {
            errorHandler(err);
          } else {
            loadKeyContent(key, data);
          }
        });
      } else {
        clearEntry(key);
      }
  });

  // Event listener for when a new entry is submitted or saved
  $(document).on('submit', '#entry-form', save);

  // Event listenter for the edit entry button
  $(document).on('click', '#edit-entry', function(event) {
    var key = $(this).data('key');

    if (typeof key === 'undefined') {
      return;
    } else {
      editEntry(key);
    }
  });

  // Event listener for the upload image toolbar button
  $(document).on('change', '#upload-image', function(event) {
    var file = $('#upload-image')[0].files[0];
    var content = $('#entry-form-content');

    // Only images can be uploaded
    var types = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif'];
    if (!file || types.indexOf(file.type) < 0) {
      alert('Only images can be uploaded.');
      return;
    }

    // Only upload if editing
    if (content.length <= 0 || !content.is(':visible')) {
      return;
    }

    // Replace any illegal characters from the filename
    var filename = 'images/' + file.name.replace(/\s|\\|\/|\(|\)/g,'-');

    // Where to upload the image
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

  // Purecss buttons seem to stay focused when you click them, so remove manually
  $(document).on('click', '.pure-button', function() {
    // Removes focus of the button
    $(this).blur();
  });

  // Event listener for [ctrl-s] key events
  $(document).bind('keydown', function(event) {
    if (event.ctrlKey && (event.which === 83)) {
      // Check if there is an entry loaded
      if ($('#entry-form').is(':visible')) {
        save(event);
      }
    }
  });

  //Event listener to publish all files
  $('.publish-all-link').click(function(event){
    dodgercms.s3.listObjects(DATA_BUCKET, function(err, data) {
      async.each(data.Contents, quickPublishEntry, function(err){
          if(err){
            alert('Error: '+err);
          }
          else {
            alert('Publish operation is complete.');
          }
      });
    });

  });

  //TinyMCE
  function removeTinyMCE() {
    $('.wysiwyg').each(function(){
        tinymce.execCommand('mceRemoveEditor',true,$(this).attr('id'));
    });
  }

  function addTinyMCE(){
    tinymce.init({
      selector: '.wysiwyg',
      height: 300,
      plugins: 'code table',
      removed_menuitems: 'newdocument'
    });
  }

  //add the before/after text of inputs so editors can see them.
  function addBeforeAfterText(){
    $('#entry-form').find('input,select,textarea').each(function(){
      if($(this).data('before')){
        $(this).before('<span class="recede">' + $(this).data('before') + ' </span>');
      }
      if($(this).data('after')){
        $(this).after('<span class="recede">' + $(this).data('after') + ' </span>');
      }
    });
  }


  //data type selector
  function addDataTypeSelector(datatype){
    //add the data type to the drop down selector
    _.each(DATATYPES.models, function(element){
      $('#datatype').append('<option value="'+element.get('id')+'">'+element.get('name')+'</option>');
    });
    $('#datatype').off('change');
    $('#datatype').on('change', function(){
      $('#entry-form').trigger('submit');
      setTimeout(function(){
        $('#close-entry').trigger('click');
      }, 500);
    });
    $('#datatype').val(datatype);
  }
  _.each(DATATYPES.models, function(element){
    $('#new-entry-data-types').append('<li><a data-value="'+element.get('id')+'">'+element.get('name')+'</a></li>');
  });

  //set the visible/not visible value of the visibility select
  function setVisibilitySelect(val){
      $('#visibility').val(val);
  }

  // Event listenter for the new entry button
  $('#new-entry-data-types a').click(function(event) {
    console.log($(this).data('value'));
    newEntry(null, $(this).data('value'));
  });

  //event listener for republishing the Menu
  $('.publish-menu-link').click(function(){
    dodgercms.entry.menu(SITE_BUCKET, SITE_ENDPOINT, function(err) {
      if (err) {
        errorHandler(err);
      } else {
        rebuildTree();
        //$('#main').data('key', key);
      }
    });
  });

  //event listener for adding a new multiple data type
  $('body').delegate('.add-multiple', 'click', function(event){
      event.preventDefault();
      var target = $(this).data('target');
      var n = $(this).prevAll().filter(function(){
        return $(this).children('input').attr('id').indexOf(target) === 0;
      }).length;

      var row = $(this).prev().clone();
      row.children('input').attr('id', target+'_'+n);
      row.children('input').val('');
      $(this).before(row);

  });

  //Event listener for removing a multiple row
  $('body').delegate('.remove-multiple', 'click', function(event){
      event.preventDefault();
      $(this).parent().remove();
  });

});
