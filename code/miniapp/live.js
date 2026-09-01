import { loadCameras, nearest, nextPage, pairAt } from './cameras.js';

const LIVE_ID = 'Anr15FA9OCI';
const LIVE_EN_ID = 'f0lYkdA-Gtw';
const SECOND_LIVE_ID = 'HXGANE2pRrA';

export const createLive = ({ tg, live, topic, place, telegram = false }) => {
    let liveEn = false;
    let mode = 'news';
    let camIds = [];
    let camPage = 0;
    let livePlayer;
    let secondLivePlayer;
    let livePlayerReady = false;
    let secondLivePlayerReady = false;
    let audioOn = false;
    let resumeMuted = false;
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
    const arm = document.getElementById('liveArm');
    const playLive = (player, videoId, volume, waitForTap) => {
        player.setVolume(volume);
        if (player === livePlayer && audioOn && !waitForTap) player.unMute();
        else player.mute();
        if (waitForTap) {
            resumeMuted = true;
            player.cueVideoById(videoId);
            return;
        }
        if (player.getVideoData?.()?.video_id === videoId) player.playVideo();
        else player.loadVideoById(videoId);
    };
    const startLivePlayers = () => {
        const [first, second] = mode === 'cameras'
            ? pairAt(camIds, camPage)
            : [liveEn ? LIVE_EN_ID : LIVE_ID, SECOND_LIVE_ID];
        const waitForTap = telegram && audioOn;
        if (livePlayerReady) first ? playLive(livePlayer, first, 100, waitForTap) : livePlayer.stopVideo();
        if (secondLivePlayerReady) second ? playLive(secondLivePlayer, second, 50, waitForTap) : secondLivePlayer.stopVideo();
        if (waitForTap) audioOn = false;
        if (arm) arm.hidden = live.hidden;
    };
    const initLivePlayers = () => {
        if (livePlayer || !window.YT?.Player) return;
        livePlayer = new window.YT.Player('liveFrame', {
            videoId: LIVE_ID,
            width: '100%',
            height: '100%',
            playerVars,
            events: {
                onReady: event => {
                    livePlayerReady = true;
                    event.target.setVolume(100);
                    if (!live.hidden) startLivePlayers();
                    else event.target.mute();
                },
                onStateChange: e => {
                    if (e.data !== 5 || !resumeMuted) return;
                    e.target.mute();
                    if (!live.hidden) e.target.playVideo();
                },
            },
        });
        secondLivePlayer = new window.YT.Player('liveSecondFrame', {
            videoId: SECOND_LIVE_ID,
            width: '100%',
            height: '100%',
            playerVars,
            events: {
                onReady: event => {
                    secondLivePlayerReady = true;
                    event.target.setVolume(50);
                    if (!live.hidden) startLivePlayers();
                    else event.target.mute();
                },
                onStateChange: e => {
                    if (e.data !== 5 || !resumeMuted) return;
                    e.target.mute();
                    if (!live.hidden) e.target.playVideo();
                },
            },
        });
    };
    window.onYouTubeIframeAPIReady = initLivePlayers;
    if (window.YT?.Player) initLivePlayers();
    const kick = () => {
        if (!livePlayerReady) return;
        if (livePlayer.getPlayerState?.() !== 1) livePlayer.playVideo();
        livePlayer.unMute();
        if (secondLivePlayerReady) secondLivePlayer.mute();
        resumeMuted = false;
        audioOn = true;
    };
    arm?.addEventListener('click', kick);
    const paintChrome = () => {
        const on = !live.hidden;
        tg.SecondaryButton?.setParams?.({ position: 'left' });
        if (!on) {
            tg.SecondaryButton?.hide();
            tg.BackButton?.hide();
        } else if (mode === 'cameras') {
            tg.SecondaryButton?.setText('LIVE NEWS');
            tg.SecondaryButton?.show();
            tg.BackButton?.show();
        } else {
            tg.SecondaryButton?.setText('LIVE CAMERAS');
            tg.SecondaryButton?.show();
            tg.BackButton?.show();
        }
        tg.MainButton.setText(on ? (mode === 'cameras' ? 'NEXT' : liveEn ? 'JAPANESE' : 'ENGLISH') : 'LIVE NEWS');
        const bar = document.getElementById('chrome');
        if (on) document.body.style.setProperty('--chrome-h', `${bar.offsetHeight}px`);
        else document.body.style.removeProperty('--chrome-h');
    };
    const setLive = on => {
        liveEn = false;
        if (!on) {
            mode = 'news';
            camPage = 0;
            audioOn = false;
            resumeMuted = false;
        }
        live.hidden = !on;
        initLivePlayers();
        if (on) {
            startLivePlayers();
        } else {
            if (livePlayerReady) livePlayer.stopVideo();
            if (secondLivePlayerReady) secondLivePlayer.stopVideo();
            if (arm) arm.hidden = true;
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
        tg.MainButton.setText(liveEn ? 'JAPANESE' : 'ENGLISH');
    };
    const syncLive = () => {
        if (topic.value === 'japan') tg.MainButton.show();
        else tg.MainButton.hide();
    };
    return { setLive, swapLang, syncLive, setCameras };
};
