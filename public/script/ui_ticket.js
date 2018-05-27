$(document).ready(function () {
    $('#formInvioEvento').submit(function (e) {
        // e.preventDefault();
        //alert('ok');
        //    $('[id^="_id"]').each(collection, function (indexInArray, valueOfElement) { 
        //         $(valueOfElement).appendTo(this);
        //    });
        $('[id^="_id"]').each(function (index, element) {
            //alert(index, element);
            console.log(element);

            $(element).appendTo($('#formInvioEvento'));
        });

        console.log(this);

        return true;
    });
});
