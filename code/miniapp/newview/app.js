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
try {
    const saved = JSON.parse(localStorage.getItem('nb') || '{}');
    if (saved.t) topic.value = saved.t;
    if (saved.l) lang.value = saved.l;
    else lang.value = autoLang();
} catch {
    lang.value = autoLang();
}

async function load() {
    feed.innerHTML = '<div id="status">Loading…</div>';
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
    render(items, feed);
    syncDiag(topic.value === 'status');
}

function onChange() {
    try { localStorage.setItem('nb', JSON.stringify({ t: topic.value, l: lang.value })); } catch {}
    tg?.HapticFeedback.selectionChanged();
    syncLive();
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
    let precise;
    const applyWeather = async coords => {
        if (!coords) return;
        const gen = ++weatherGen;
        try {
            const next = await fetchWeatherAlerts(coords);
            if (gen !== weatherGen) return;
            setPlace({ city: next.city, country: next.country });
            jma = next.alerts.length ? next : null;
            if (jma && topic.value === 'japan') load();
        } catch {}
    };
    const requestLocation = ({ force } = {}) => {
        tg?.HapticFeedback.selectionChanged();
        if (native?.initData) {
            tg.LocationManager?.init(() => {
                const lm = tg.LocationManager;
                lm.getLocation(coords => {
                    if (!coords) {
                        setPlace({ geo: lm.isAccessGranted === false ? 'rejected' : 'unknown' });
                        return;
                    }
                    precise = true;
                    setPlace({
                        source: 'Telegram',
                        lat: coords.latitude,
                        lon: coords.longitude,
                        geo: 'approved',
                    });
                    applyWeather(coords);
                });
            });
            return;
        }
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                precise = true;
                setPlace({
                    source: 'Browser',
                    lat: coords.latitude,
                    lon: coords.longitude,
                    geo: 'approved',
                });
                applyWeather(coords);
            },
            err => {
                if (err?.code === 1) setPlace({ geo: 'rejected' });
            },
            { maximumAge: force ? 0 : 300_000, timeout: 8_000 },
        );
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
    requestLocation();
    document.getElementById('diag-ask').onclick = () => requestLocation({ force: true });
    tg.MainButton.setText('LIVE NEWS');
    tg.MainButton.onClick(() => setLive(live.hidden));
    tg.SecondaryButton?.onClick(swapLang);
    tg.BackButton.onClick(() => setLive(false));
    syncLive();
}
load();
