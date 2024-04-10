// Only show additional models if user has seen the tour:
if(localStorage.getItem('have-seen-tour')) {
    var random = Math.random();
    if(random <= 1.0/12) {
        setTimeout(function() {
          $("#mailer").modal({
            showClose: false
          });
        }, 30000);

    }
    else if (random <= (1.0/12)+(1.0/24)+1) {
        var tag = document.createElement('script');

        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        // 3. This function creates an <iframe> (and YouTube player)
        //    after the API code downloads.
        var player;
        function onYouTubeIframeAPIReady() {
          player = new YT.Player('sidebar-video', {
            height: '211',
            width: '375',
            videoId: 'Iyx8-phIxVY',
            playerVars: {
              'playsinline': 1
            },
            events: {
              'onReady': onPlayerReady,
            }
          });
        }

        // 4. The API will call this function when the video player is ready.
        function onPlayerReady(event) {
          event.target.mute();
          event.target.playVideo();
        }

        $('#sidebar-video-container').on('click', 
            function() {
                player.pauseVideo();
                $('#sidebar-video-container').hide();
            }
        );

    }
}
