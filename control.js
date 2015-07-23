$(function(){
    var host = location.origin.replace(/^http/, 'ws');
    var ws = new WebSocket(host + '/control');
    var scale = 2;
    var videoSelector = $('#select-video');
    var originalVideoWidth;

    $('.video-frame').resizable({
        aspectRatio: true,
        stop: function(event, ui) {
            var ratio = (ui.size.width / originalVideoWidth) * scale;
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
        populateSelectVideo(data.options);

        //initialize video in devices
        ws.send(JSON.stringify({ video: videoSelector.val() }));
        ws.send(JSON.stringify({ deviceId: 'all', changes: {scale: 2} }));

        //initialize video in control
        document.querySelector('video').src = location.origin + '/uploads/' + videoSelector.val();
        document.querySelector('video').onloadedmetadata = function() {
          var width = this.videoWidth;
          originalVideoWidth = this.videoWidth;
          var height = this.videoHeight;
          $('.video-frame').css('width', width).css('height', height);
        };

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
            if (text == 'reset') {
              document.querySelector('video').currentTime = 0;
            } else if (text == 'pause') {
              document.querySelector('video').pause();
            } else if (text == 'resume') {
              document.querySelector('video').play();
            }
        }
    }

    window.resetVideos = pingWithText('reset');
    window.pause = pingWithText('pause');
    window.resume = pingWithText('resume');

    //Populate video dropdown
    function populateSelectVideo(options) {
      var select = document.getElementById('select-video');

      for (var i = 0; i < options.length; i++){
          var opt = options[i];
          var el = document.createElement('option');
          el.textContent = opt;
          el.value = opt;
          select.appendChild(el);
      }
    }

    //Listen for dropdown change
    videoSelector.on('change', function() {
      document.querySelector('video').src = location.origin + '/uploads/' + $(this).val();
      ws.send(JSON.stringify({ video: $(this).val() }));
    });

});