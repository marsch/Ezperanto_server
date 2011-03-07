$('#authorize input[name=authorizebutton]').live('click', function(e) {
    $('#authorize input[name=authorized]').val(1);
    $(this).parent().submit();
}); 
$('#authorize a[name=cancel_button]').live('click', function(e){ 
    $('#authorize input[name=authorized]').val(0);
    $(this).parent().submit();
});