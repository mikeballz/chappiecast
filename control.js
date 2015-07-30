$(function () {
    var host = location.origin.replace(/^http/, 'ws');
    var ws = new WebSocket(host + '/control');
    var scale = 2;
    var videoSelector = $('#select-video');
    var videoElement = document.querySelector('video');
    var originalVideoWidth;
    var selectedVideo;
    var ratio = 2;

    $('.video-frame').resizable({
        aspectRatio: true,
        stop: function (event, ui) {
            ratio = (ui.size.width / originalVideoWidth) * 2;
            send({
                deviceId: 'all',
                changes: {
                    scale: ratio
                }
            });
        }
    });

    videoElement.onloadedmetadata = function () {
        originalVideoWidth = this.videoWidth;
        var width = this.videoWidth * (scale / 2);
        var height = this.videoHeight * (scale / 2);
        $('.video-frame').css('width', width).css('height', height);
    };

    ws.onmessage = function (event) {
        var data = JSON.parse(event.data);

        if (data.videos) {
            populateSelectVideo(data.videos, data.selectedVideo);
            if (videoSelector.val() != data.selectedVideo) {
                send({video: videoSelector.val()});
            }
            setVideoSource(videoSelector.val());
        } else if (data.devices) {
            $.each(data.devices, function (index, device) {
                var newElement = document.createElement('div');
                $('.video-frame').append(newElement);
                $(newElement)
                    .addClass('device')
                    .css({
                        height: device.height / scale,
                        width: device.width / scale,
                        top: (-device.position.top || 0) + 'px',
                        left: (-device.position.left || 0) + 'px'
                    })
                    .draggable({
                        containment: 'parent',
                        stop: function (event, ui) {
                            send({
                                deviceId: device.id,
                                changes: {
                                    position: {
                                        top: -ui.position.top,
                                        left: -ui.position.left
                                    }
                                }
                            })
                        }
                        }).rotatable({
                           snap: true,
                           angle: -parseFloat(device.rotation),
                           rotate: function(event, ui) {
                               if(!isNaN(ui.angle.current)) {
                                   send({
                                       deviceId: device.id,
                                       changes: {
                                           rotation: -(ui.angle.current.toFixed(2)) + 'rad'
                                       }
                                   });
                               }
                           }
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

    function send(text) {
        ws.send(JSON.stringify(text));
    }

    window.resetVideos = function () {
        videoElement.currentTime = 0;
        send('reset');
    };

    window.pause = function () {
        videoElement.pause();
        send('pause');
    };

    window.resume = function () {
        videoElement.play();
        send('resume');
    };

    //Populate video dropdown
    function populateSelectVideo(allVideos, currentVideo) {
        videoSelector.append($.map(allVideos, function (video) {
            return $('<option>', {value: video}).text(video);
        }));

        if (currentVideo) {
            videoSelector.val(currentVideo);
        }
    }

    function setVideoSource(source) {
        videoElement.src = 'uploads/' + source
    }

    //Listen for dropdown change
    videoSelector.on('change', function () {
        var newVideo = $(this).val();
        if (selectedVideo !== newVideo) {
            selectedVideo = newVideo;
            scale = 2;
            setVideoSource(newVideo);
            send({video: newVideo});
        }
    });

});