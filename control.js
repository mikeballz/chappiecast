$(function(){
    var host = location.origin.replace(/^http/, 'ws');
    var ws = new WebSocket(host + '/control');
    var scale = 2;

    $('.video-frame').resizable({
        aspectRatio: true,
        stop: function(event, ui) {
            var ratio = (ui.size.width / ui.originalSize.width) * scale;
            ws.send(JSON.stringify({
                deviceId: 'all',
                changes: {
                    scale: ratio
                }
            }))
        }
    });

    ws.onmessage = function(event) {
        var data = JSON.parse(event.data);
        if (data.devices) {
            $.each(data.devices, function(index, device){
                var newElement = document.createElement('div');
                $('.video-frame').append(newElement);
                $(newElement)
                    .addClass('device')
                    .css({
                        height:device.height / scale,
                        width:device.width / scale,
                        top:(-device.position.top || 0) + 'px',
                        left:(-device.position.left || 0) + 'px'
                    })
                    .draggable({
                        containment: 'parent',
                        stop: function(event, ui) {
                            ws.send(JSON.stringify({
                                deviceId:device.id,
                                changes:{
                                    position:{
                                        top: -ui.position.top,
                                        left: -ui.position.left
                                    }}}))
                        }
                    //}).rotatable({
                    //    snap: true,
                    //    stop: function(event, ui) {
                    //        ws.send(JSON.stringify({
                    //            deviceId:device.id,
                    //            changes:{
                    //                rotation: ui.angle.current.toFixed(2)+ 'rad'
                    //            }}))
                    //    }
                    }).append('<span class="device-id">' + device.id + '</span>');
            });

            if (data.devices[0].scale && scale != data.devices[0].scale) {
                scale = data.devices[0].scale || scale;

                $('.video-frame').css('width', setToScale).css('height', setToScale);
            }


            function setToScale(idx, value) {
                value = parseFloat(value);
                return value * (scale / 2);
            }
        }
    };

    function pingWithText(text) {
        return function(){
            ws.send(JSON.stringify(text))
        }
    }

    window.resetVideos = pingWithText('reset');
    window.pause = pingWithText('pause');
    window.resume = pingWithText('resume');

});