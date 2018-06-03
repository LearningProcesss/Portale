
$(document).ready(function () {
    $('#formInvioEvento').submit(function (e) {
        $('[id^="_id"]').each(function (index, element) {
            $(element).appendTo($('#formInvioEvento'));
        });
        return true;
    });
});

// $(document).ready(function () {
//     $('[id^="_dateEvento"]').each(function (index, element) {

//         alert($(element).val());
//         alert(moment($(element).val()).format('DD-MM-YYYY'));
//     });
// });

// $(document).ready(function() { 
//     $(window).load(function() { 
//         $('[id^="_dateEvento"]').each(function (index, element) {

//             alert($(element).val());
//             //alert(moment($(element).val()).format('DD-MM-YYYY'));
//         });
//     });
//   });

