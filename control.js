$(function () {
    var host = location.origin.replace(/^http/, 'ws');
    var ws = new WebSocket(host + '/control');
    var DEFAULT_SCALE = 2;
    var scale = DEFAULT_SCALE;
    var videoSelector = $('#select-video');
    var videoElement = document.querySelector('video');
    var originalVideoWidth;
    var selectedVideo;
    var showDeviceIds = false;

    $('.video-frame').resizable({
        aspectRatio: true,
        stop: function (event, ui) {
            var scale = ((ui.size.width / originalVideoWidth) * DEFAULT_SCALE).toFixed(2);
            send({
                deviceId: 'all',
                changes: {
                    scale: scale
                }
            });
        }
    });

    videoElement.onloadedmetadata = function () {
        originalVideoWidth = this.videoWidth;
        var width = this.videoWidth * (scale / DEFAULT_SCALE);
        var height = this.videoHeight * (scale / DEFAULT_SCALE);
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

            if (data.hasOwnProperty('showIds')){
                setCheckboxValue(data.showIds);
            }
        } else if (data.devices.length > 0) {
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
                return value * (scale / DEFAULT_SCALE);
            }
        }
    };

    function send(text) {
        ws.send(JSON.stringify(text));
    }

    function resetVideos () {
        videoElement.currentTime = 0;
        send('reset');
    }

    $('#reset-button').click(resetVideos);

    function pause () {
        videoElement.pause();
        send('pause');
    }

    $('#pause-button').click(pause);

    function resume () {
        videoElement.play();
        send('resume');
    }

    $('#resume-button').click(resume);

    function toggleDeviceId() {
        if (this.checked){
            showDeviceIds = true;
            send('show ids');
        } else {
            showDeviceIds = false;
            send('hide ids');
        }
    }

    $('#show-device-id').change(toggleDeviceId);

    function setCheckboxValue(showDeviceIds) {
        $('#show-device-id').prop('checked',showDeviceIds);
    }

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
            scale = DEFAULT_SCALE;
            setVideoSource(newVideo);
            send({video: newVideo});
        }
    });

    $(videoElement).bind('ended', function(e){
        resetVideos();
        resume();
    });

});