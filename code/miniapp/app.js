import { fetchClusters, render } from './feed.js';
import { quakeItems } from './jma-quake.js';
import { fetchWeatherAlerts, weatherItems } from './jma-weather.js';
import { createChrome } from './chrome.js';
import { createLive } from './live.js';
import { pipelineItems } from './pipeline.js';
import { createDiag, setPlace } from './diag.js';

const topic = document.getElementById('topic');
const lang = document.getElementById('lang');
const feed = document.getElementById('feed');
const live = document.getElementById('live');
const native = window.Telegram?.WebApp;
const tg = native?.initData ? native : createChrome();
const { setLive, swapLang, syncLive } = createLive({ tg, live, topic });
const syncDiag = createDiag(document.getElementById('diag'));
let syncLocation = () => {};

const pickLang = tag => {
    const t = (tag || '').toLowerCase().replace('_', '-');
    if (t.startsWith('es')) return 'es';
    if (t.startsWith('ja')) return 'jp';
    return t ? 'en' : '';
};
const fromUa = ua => {
    if (/\bes[-_][a-z]{2}\b/i.test(ua)) return 'es';
    if (/\bja[-_][a-z]{2}\b/i.test(ua)) return 'jp';
    return '';
};
const autoLang = () =>
    pickLang(navigator.languages?.[0]) ||
    pickLang(navigator.language) ||
    fromUa(navigator.userAgent) ||
    'en';

let jma = null;
let loadGen = 0;
try {
    const saved = JSON.parse(localStorage.getItem('nb') || '{}');
    if (saved.t) topic.value = saved.t;
    if (saved.l) lang.value = saved.l;
    else lang.value = autoLang();
} catch {
    lang.value = autoLang();
}

async function load() {
    const gen = ++loadGen;
    feed.innerHTML = '<div id="status">Loading…</div>';
    syncDiag(topic.value === 'status');
    let items = [];
    try {
        items = topic.value === 'status'
            ? await pipelineItems()
            : await fetchClusters(topic.value, lang.value);
    } catch {}
    if (topic.value === 'japan') {
        if (jma?.alerts.length) items.unshift(...weatherItems(jma, lang.value));
        try {
            items.unshift(...await quakeItems(lang.value));
        } catch {}
    }
    if (gen !== loadGen) return;
    render(items, feed);
    if (topic.value !== 'status' && items.length) {
        feed.insertAdjacentHTML('beforeend', '<p>END</p>');
    }
}

function onChange() {
    try { localStorage.setItem('nb', JSON.stringify({ t: topic.value, l: lang.value })); } catch {}
    tg?.HapticFeedback.selectionChanged();
    syncLive();
    syncLocation();
    load();
}
topic.onchange = lang.onchange = onChange;

if (tg) {
    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes();
    try {
        tg.setHeaderColor('secondary_bg_color');
        tg.setBackgroundColor('bg_color');
    } catch {}
    let weatherGen = 0;
    let weatherKey = '';
    let precise;
    const applyWeather = async coords => {
        if (!Number.isFinite(coords?.latitude) || !Number.isFinite(coords?.longitude)) return;
        const key = `${coords.latitude.toFixed(2)},${coords.longitude.toFixed(2)}`;
        if (key === weatherKey) return;
        weatherKey = key;
        const gen = ++weatherGen;
        try {
            const next = await fetchWeatherAlerts(coords);
            if (gen !== weatherGen) return;
            setPlace({ city: next.city, country: next.country });
            jma = next.alerts.length ? next : null;
            if (topic.value === 'japan') load();
        } catch {
            if (gen === weatherGen) weatherKey = '';
        }
    };
    const acceptLocation = (source, coords) => {
        precise = true;
        setPlace({
            source,
            lat: coords.latitude,
            lon: coords.longitude,
            geo: 'approved',
        });
        applyWeather(coords);
    };
    const rejectLocation = err => {
        if (err?.code === 1) setPlace({ geo: 'rejected' });
    };
    const requestLocation = ({ force } = {}) => {
        if (native?.initData) {
            tg.LocationManager?.init(() => {
                const lm = tg.LocationManager;
                lm.getLocation(coords => {
                    if (!coords) {
                        setPlace({ geo: lm.isAccessGranted === false ? 'rejected' : 'unknown' });
                        return;
                    }
                    acceptLocation('Telegram', coords);
                });
            });
            return;
        }
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => acceptLocation('Browser', coords),
            rejectLocation,
            { enableHighAccuracy: !!force, maximumAge: force ? 0 : 300_000, timeout: 8_000 },
        );
    };
    let browserWatch;
    let telegramPoll;
    syncLocation = () => {
        if (topic.value !== 'japan') {
            if (browserWatch != null) navigator.geolocation?.clearWatch(browserWatch);
            clearInterval(telegramPoll);
            browserWatch = telegramPoll = null;
            return;
        }
        if (native?.initData) {
            requestLocation({ force: true });
            telegramPoll ||= setInterval(() => requestLocation({ force: true }), 60_000);
        } else if (navigator.geolocation?.watchPosition && browserWatch == null) {
            browserWatch = navigator.geolocation.watchPosition(
                ({ coords }) => acceptLocation('Browser', coords),
                rejectLocation,
                { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
            );
        }
    };
    fetch('https://ip.guide/')
        .then(r => r.json())
        .then(data => {
            setPlace({
                ip: data.ip,
                city: data.location?.city,
                country: data.location?.country,
                lat: data.location?.latitude,
                lon: data.location?.longitude,
                source: 'IP',
            });
            if (!native?.initData && !precise) applyWeather(data.location);
        })
        .catch(() => {});
    if (!navigator.geolocation?.watchPosition || topic.value !== 'japan') requestLocation();
    syncLocation();
    document.getElementById('diag-ask').onclick = () => {
        tg?.HapticFeedback.selectionChanged();
        requestLocation({ force: true });
    };
    tg.MainButton.setText('LIVE NEWS');
    tg.MainButton.onClick(() => setLive(live.hidden));
    tg.SecondaryButton?.onClick(swapLang);
    tg.BackButton.onClick(() => setLive(false));
    syncLive();
}
load();
