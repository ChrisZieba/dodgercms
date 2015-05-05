/**
 * Login
 *
 * This source code is licensed under the MIT-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Author: Chris Zieba (zieba.chris@gmail.com)
*/

$(function() {
  'use strict';

  autofill();

  // Fill in the form values if they exist locally
  function autofill() {
    $("#login-form-access-key").val(localStorage.getItem("dodgercms-access-key-id") || '');
    $("#login-form-access-secret").val(localStorage.getItem("dodgercms-secret-access-key") || '');
    $("#login-form-data-bucket").val(localStorage.getItem("dodgercms-data-bucket") || '');
    $("#login-form-assets-bucket").val(localStorage.getItem("dodgercms-assets-bucket") || '');
    $("#login-form-site-bucket").val(localStorage.getItem("dodgercms-site-bucket") || '');
  }

  // Login functionality
  $("#login-form").submit(function(event) {
    // Don't want the form to submit
    event.preventDefault();

    var accessKey = $.trim($("#login-form-access-key").val());
    var accessSecret = $.trim($("#login-form-access-secret").val());
    var dataBucket = $.trim($("#login-form-data-bucket").val());
    var assetsBucket = $.trim($("#login-form-assets-bucket").val());
    var siteBucket = $.trim($("#login-form-site-bucket").val());
    var remember = $("#login-remember").is(":checked");

    // Validate the form fields
    if (accessKey === '' || 
      accessSecret === '' || 
      dataBucket === '' || 
      assetsBucket === '' ||
      siteBucket === '') 
    {
      alert('All fields are required.');
      return;
    }

    var params = {
      dataBucket : dataBucket,
      assetsBucket: assetsBucket,
      siteBucket: siteBucket,
      accessKey: accessKey,
      accessSecret: accessSecret,
      remember: remember
    };
    
    // Block the page
    $.blockUI({ 
      css: { 
        'border': 'none',
        'font-size': '90%',
        'padding': '15px',
        'backgroundColor': '#000',
        '-webkit-border-radius': '10px',
        '-moz-border-radius': '10px',
        'opacity': .5,
        'color': '#fff'
      }
    }); 

    dodgercms.auth.login(params, function(err, data) {
      // Remove the page block
      $.unblockUI();

      if (err) {
        alert(err);
      } else {
        // Redirects the manager
        window.location.replace(location.protocol + "//" + location.host);
      }
    });
  });
});