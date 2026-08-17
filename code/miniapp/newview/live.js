const LIVE_ID = 'Anr15FA9OCI';
const LIVE_EN_ID = 'f0lYkdA-Gtw';
const SECOND_LIVE_ID = 'HXGANE2pRrA';

export const createLive = ({ tg, live, topic }) => {
    let liveEn = false;
    let livePlayer;
    let secondLivePlayer;
    let livePlayerReady = false;
    let secondLivePlayerReady = false;
    const playerVars = {
        autoplay: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        disablekb: 1,
        enablejsapi: 1,
        origin: window.location.origin,
    };
    const playLive = (player, videoId, volume) => {
        player.loadVideoById(videoId);
        player.setVolume(volume);
        player.unMute();
        player.playVideo();
        setTimeout(() => {
            if (live.hidden) return;
            player.setVolume(volume);
            player.unMute();
            player.playVideo();
        }, 500);
        setTimeout(() => {
            if (live.hidden || player.getPlayerState() === YT.PlayerState.PLAYING) return;
            player.mute();
            player.playVideo();
        }, 1500);
    };
    const startLivePlayers = () => {
        if (livePlayerReady) {
            playLive(livePlayer, liveEn ? LIVE_EN_ID : LIVE_ID, 100);
        }
        if (secondLivePlayerReady) {
            playLive(secondLivePlayer, SECOND_LIVE_ID, 50);
        }
    };
    const initLivePlayers = () => {
        if (livePlayer || !window.YT?.Player) return;
        livePlayer = new YT.Player('liveFrame', {
            videoId: LIVE_ID,
            playerVars,
            events: {
                onReady: event => {
                    livePlayerReady = true;
                    event.target.setVolume(100);
                    if (!live.hidden) playLive(event.target, liveEn ? LIVE_EN_ID : LIVE_ID, 100);
                },
            },
        });
        secondLivePlayer = new YT.Player('liveSecondFrame', {
            videoId: SECOND_LIVE_ID,
            playerVars,
            events: {
                onReady: event => {
                    secondLivePlayerReady = true;
                    event.target.setVolume(50);
                    if (!live.hidden) playLive(event.target, SECOND_LIVE_ID, 50);
                },
            },
        });
    };
    window.onYouTubeIframeAPIReady = () => {
        if (!live.hidden) initLivePlayers();
    };
    const setLive = on => {
        liveEn = false;
        live.hidden = !on;
        initLivePlayers();
        if (on) {
            startLivePlayers();
        } else {
            if (livePlayerReady) livePlayer.stopVideo();
            if (secondLivePlayerReady) secondLivePlayer.stopVideo();
        }
        tg.MainButton.setText(on ? 'BACK TO NEWSBUCKET' : 'LIVE NEWS');
        tg.SecondaryButton?.setText('SWITCH TO ENGLISH');
        [tg.SecondaryButton, tg.BackButton].forEach(b => { b && (on ? b.show() : b.hide()); });
        tg.HapticFeedback.impactOccurred('heavy');
    };
    const swapLang = () => {
        liveEn = !liveEn;
        if (livePlayerReady) {
            playLive(livePlayer, liveEn ? LIVE_EN_ID : LIVE_ID, 100);
        }
        tg.SecondaryButton.setText(liveEn ? 'SWITCH TO JAPANESE' : 'SWITCH TO ENGLISH');
    };
    const syncLive = () => tg && (topic.value === 'japan' ? tg.MainButton.show() : tg.MainButton.hide());
    return { setLive, swapLang, syncLive };
};
