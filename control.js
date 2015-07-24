$(function(){
    var host = location.origin.replace(/^http/, 'ws');
    var ws = new WebSocket(host + '/control');
    var scale = 2;
    var videoSelector = $('#select-video');
    var originalVideoWidth;
    var selectedVideo;
    var ratio = 2;

    $('.video-frame').resizable({
        aspectRatio: true,
        stop: function(event, ui) {
            ratio = (ui.size.width / originalVideoWidth) * 2;
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
        selectedVideo = data.selectedVideo;
        populateSelectVideo(data.options, data.selectedVideo);

        //initialize video in devices
        if (videoSelector.val() != data.selectedVideo){
          ws.send(JSON.stringify({ video: videoSelector.val() }));
        }

        //initialize video in control
        document.querySelector('video').src = location.origin + '/uploads/' + videoSelector.val();
        document.querySelector('video').onloadedmetadata = function() {
          originalVideoWidth = this.videoWidth;
          var width = this.videoWidth*(scale/2);
          var height = this.videoHeight*(scale/2);
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
    function populateSelectVideo(options, video) {
      var select = document.getElementById('select-video');

      for (var i = 0; i < options.length; i++){
          var opt = options[i];
          var el = document.createElement('option');
          el.textContent = opt;
          el.value = opt;
          select.appendChild(el);
      }

      if (video){
        document.getElementById('select-video').value = video;
      }
    }

    //Listen for dropdown change
    videoSelector.on('change', function() {
      console.log(selectedVideo);
      if (selectedVideo != $(this).val()){
        selectedVideo=$(this).val();
        scale = 2;
        document.querySelector('video').src = location.origin + '/uploads/' + $(this).val();
        ws.send(JSON.stringify({ video: $(this).val() }));
      }
    });

});