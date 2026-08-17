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

let jma = null;
try {
    const saved = JSON.parse(localStorage.getItem('nb') || '{}');
    if (saved.t) topic.value = saved.t;
    if (saved.l) lang.value = saved.l;
} catch {}

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
            jma = next;
            if (jma && topic.value === 'japan') load();
        } catch {}
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
    if (native?.initData) {
        tg.LocationManager?.init(() => {
            tg.LocationManager.getLocation(coords => {
                if (!coords) return;
                precise = true;
                setPlace({
                    source: 'Telegram',
                    lat: coords.latitude,
                    lon: coords.longitude,
                });
                applyWeather(coords);
            });
        });
    } else {
        navigator.geolocation?.getCurrentPosition(
            ({ coords }) => {
                precise = true;
                setPlace({
                    source: 'Browser',
                    lat: coords.latitude,
                    lon: coords.longitude,
                });
                applyWeather(coords);
            },
            () => {},
            { maximumAge: 300_000, timeout: 8_000 },
        );
    }
    tg.MainButton.setText('LIVE NEWS');
    tg.MainButton.onClick(() => setLive(live.hidden));
    tg.SecondaryButton?.onClick(swapLang);
    tg.BackButton.onClick(() => setLive(false));
    syncLive();
}
load();
