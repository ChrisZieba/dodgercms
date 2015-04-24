$(function() {

    autofill();

    // fill in the form values if they exist locally
    function autofill() {
        $("#login-form-access-key").val(localStorage.getItem("dodgercms-access-key-id") || '');
        $("#login-form-access-secret").val(localStorage.getItem("dodgercms-secret-access-key") || '');
        $("#login-form-data-bucket").val(localStorage.getItem("dodgercms-data-bucket") || '');
        $("#login-form-assets-bucket").val(localStorage.getItem("dodgercms-assets-bucket") || '');
        $("#login-form-site-bucket").val(localStorage.getItem("dodgercms-site-bucket") || '');
    }

    // login functionality
    $("#login-form").submit(function(event) {
        // Don't want the form to submit
        event.preventDefault();

        var accessKey = $.trim($("#login-form-access-key").val());
        var accessSecret = $.trim($("#login-form-access-secret").val());
        var dataBucket = $.trim($("#login-form-data-bucket").val());
        var assetsBucket = $.trim($("#login-form-assets-bucket").val());
        var siteBucket = $.trim($("#login-form-site-bucket").val());
        var remember = $("#login-remember").is(":checked");

        // validate the form fields
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
        
        dodgercms.auth.login(params, function(err) {
            if (err) {
                alert(err);
            } else {
                window.location.replace(location.protocol + "//" + location.host);
            }
        });
    });
});