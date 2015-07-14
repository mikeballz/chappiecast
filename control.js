$(function(){
    $('.video-frame').resizable({aspectRatio: true});
    $('.device').draggable({containment: 'parent'}).rotatable();

    var host = location.origin.replace(/^http/, 'ws');
    var ws = new WebSocket(host + '/control');
    var devices = [];
    var scale = 2;

    ws.onmessage = function(event) {
        var data = JSON.parse(event.data);
        if (data.devices) {
            $.each(data.devices, function(index, device){
                var newElement = document.createElement('div');
                $('.video-frame').append(newElement);
                $(newElement)
                    .addClass('device')
                    .css({height:device.height / scale, width:device.width / scale})
                    .draggable({
                        containment: 'parent',
                        stop: function(event, ui) {
                            ws.send(JSON.stringify({
                                deviceId:device.id,
                                changes:{
                                    position:{
                                        top: -ui.position.top * scale,
                                        left: -ui.position.left * scale
                                    }}}))
                        }
                    }).rotatable({
                        stop: function(event, ui) {
                            ws.send(JSON.stringify({
                                deviceId:device.id,
                                changes:{
                                    rotation: ui.angle.current.toFixed(2)+ 'rad'
                                }}))
                        }
                    }).append('<span class="device-id">' + device.id + '</span>');
            })
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