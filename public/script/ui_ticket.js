$(document).ready(function () {
    $('#formInvioEvento').submit(function (e) {
        $('[id^="_id"]').each(function (index, element) {
            $(element).appendTo($('#formInvioEvento'));
        });
        return true;
    });
});

// $(document).ready(function () {
//     $('[id^="_navAction"]').click(function (e) {
//         alert(e);
//         $('[id^="_navAction"]').removeClass('active');
//         $(this).addClass('active');
//     });
// });
