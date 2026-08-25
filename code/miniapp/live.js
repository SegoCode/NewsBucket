import { loadCameras, nearest, nextPage, pairAt } from './cameras.js';

const LIVE_ID = 'Anr15FA9OCI';
const LIVE_EN_ID = 'f0lYkdA-Gtw';
const SECOND_LIVE_ID = 'HXGANE2pRrA';

export const createLive = ({ tg, live, topic, place }) => {
    let liveEn = false;
    let mode = 'news';
    let camIds = [];
    let camPage = 0;
    let livePlayer;
    let secondLivePlayer;
    let livePlayerReady = false;
    let secondLivePlayerReady = false;
    const playerVars = {
        autoplay: 1,
        mute: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        disablekb: 1,
        enablejsapi: 1,
        origin: window.location.origin,
    };
    const playLive = (player, videoId, volume) => {
        player.mute();
        player.setVolume(volume);
        if (player.getVideoData?.()?.video_id === videoId) player.playVideo();
        else player.loadVideoById(videoId);
    };
    const startLivePlayers = () => {
        const [first, second] = mode === 'cameras'
            ? pairAt(camIds, camPage)
            : [liveEn ? LIVE_EN_ID : LIVE_ID, SECOND_LIVE_ID];
        if (livePlayerReady) first ? playLive(livePlayer, first, 100) : livePlayer.stopVideo();
        if (secondLivePlayerReady) second ? playLive(secondLivePlayer, second, 50) : secondLivePlayer.stopVideo();
    };
    const initLivePlayers = () => {
        if (livePlayer || !window.YT?.Player) return;
        livePlayer = new window.YT.Player('liveFrame', {
            videoId: LIVE_ID,
            playerVars,
            events: {
                onReady: event => {
                    livePlayerReady = true;
                    event.target.setVolume(100);
                    event.target.mute();
                    if (!live.hidden) startLivePlayers();
                },
            },
        });
        secondLivePlayer = new window.YT.Player('liveSecondFrame', {
            videoId: SECOND_LIVE_ID,
            playerVars,
            events: {
                onReady: event => {
                    secondLivePlayerReady = true;
                    event.target.setVolume(50);
                    event.target.mute();
                    if (!live.hidden) startLivePlayers();
                },
            },
        });
    };
    window.onYouTubeIframeAPIReady = initLivePlayers;
    if (window.YT?.Player) initLivePlayers();
    const paintChrome = () => {
        const on = !live.hidden;
        tg.MainButton.setText(on ? 'BACK' : 'LIVE NEWS');
        if (!on) {
            tg.SecondaryButton?.hide();
            tg.CamerasButton?.hide();
        } else if (mode === 'cameras') {
            tg.CamerasButton?.setText('LIVE NEWS');
            tg.SecondaryButton?.setText('NEXT');
            tg.CamerasButton?.show();
            tg.SecondaryButton?.show();
        } else {
            tg.CamerasButton?.setText('LIVE CAMERAS');
            tg.SecondaryButton?.setText(liveEn ? 'SWITCH TO JAPANESE' : 'SWITCH TO ENGLISH');
            tg.CamerasButton?.show();
            tg.SecondaryButton?.show();
        }
        const bar = document.getElementById('chrome');
        if (on) document.body.style.setProperty('--chrome-h', `${bar.offsetHeight}px`);
        else document.body.style.removeProperty('--chrome-h');
    };
    const setLive = on => {
        liveEn = false;
        if (!on) {
            mode = 'news';
            camPage = 0;
        }
        live.hidden = !on;
        initLivePlayers();
        if (on) {
            startLivePlayers();
        } else {
            if (livePlayerReady) livePlayer.stopVideo();
            if (secondLivePlayerReady) secondLivePlayer.stopVideo();
        }
        paintChrome();
        tg.HapticFeedback.impactOccurred('heavy');
    };
    const setCameras = async () => {
        if (live.hidden) return;
        if (mode === 'cameras') {
            mode = 'news';
            camPage = 0;
            startLivePlayers();
            paintChrome();
            return;
        }
        const spots = await loadCameras();
        const { lat, lon } = place?.() || {};
        camIds = nearest(spots, lat, lon, 10).map(s => s.video_id);
        camPage = 0;
        mode = 'cameras';
        startLivePlayers();
        paintChrome();
    };
    const nextCams = () => {
        camPage = nextPage(camIds.length, camPage);
        startLivePlayers();
    };
    const swapLang = () => {
        if (mode === 'cameras') {
            nextCams();
            return;
        }
        liveEn = !liveEn;
        startLivePlayers();
        tg.SecondaryButton.setText(liveEn ? 'SWITCH TO JAPANESE' : 'SWITCH TO ENGLISH');
    };
    const syncLive = () => {
        if (topic.value === 'japan') tg.MainButton.show();
        else tg.MainButton.hide();
    };
    return { setLive, swapLang, syncLive, setCameras };
};
