import { articlesHtml, fetchClusters, fetchYesterday, render } from './feed.js';
import { quakeItems } from './jma-quake.js';
import { fetchWeatherAlerts, weatherItems } from './jma-weather.js';
import { fetchCloudOutages } from './cloud-outages.js';
import { fetchFinanceSpikes } from './finance-spikes.js';
import { fetchFxRate } from './fx-rate.js';
import { createChrome } from './chrome.js';
import { createLive } from './live.js';
import { pipelineItems } from './pipeline.js';
import { createDiag } from './diag.js';
import { createPlace, getPlace, setPlace, watchPlace, PREFECTURES, prefectureFor } from './place.js';

const topic = document.getElementById('topic');
const lang = document.getElementById('lang');
const feed = document.getElementById('feed');
const live = document.getElementById('live');
const native = window.Telegram?.WebApp;
const telegram = !!(native?.initData && native.MainButton);
const tg = telegram ? native : createChrome();
const platform = native?.initData ? native : tg;
const { setLive, swapLang, syncLive, setCameras } = createLive({ tg, live, topic, place: getPlace, telegram });
const syncDiag = createDiag(document.getElementById('diag'));
let syncLocation = () => {};

const pickLang = tag => {
    const t = (tag || '').toLowerCase().replaceAll('_', '-');
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
const syncHtmlLang = () => {
    document.documentElement.lang = { en: 'en', es: 'es', jp: 'en' }[lang.value] || 'en';
};
syncHtmlLang();

async function load() {
    loadGen += 1;
    const gen = loadGen;
    feed.innerHTML = '<div id="status">Loading…</div>';
    syncDiag(topic.value === 'status');
    const outagesP = topic.value === 'tech' ? fetchCloudOutages(lang.value) : null;
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
    if (topic.value === 'finance') {
        try {
            items.unshift(...await fetchFinanceSpikes(lang.value));
        } catch {}
        try {
            items.unshift(...await fetchFxRate(lang.value));
        } catch {}
    }
    if (gen !== loadGen) return;
    render(items, feed);
    if (outagesP) {
        void outagesP.then(outages => {
            if (gen !== loadGen || !outages.length) return;
            if (items.length) feed.insertAdjacentHTML('afterbegin', articlesHtml(outages));
            else render(outages, feed);
        });
    }
    if (topic.value !== 'status' && items.length) {
        feed.insertAdjacentHTML('beforeend', `<p>${{ en: 'YESTERDAY', es: 'AYER', jp: '昨日' }[lang.value] || 'YESTERDAY'}</p>`);
        const prev = await fetchYesterday(topic.value, lang.value);
        if (gen !== loadGen || !prev.length) return;
        feed.insertAdjacentHTML('beforeend', articlesHtml(prev));
    }
}

function onChange() {
    try { localStorage.setItem('nb', JSON.stringify({ t: topic.value, l: lang.value })); } catch {}
    syncHtmlLang();
    platform.HapticFeedback?.selectionChanged();
    syncLive();
    syncLocation();
    load();
}
topic.onchange = lang.onchange = onChange;

if (platform) {
    platform.ready();
    platform.expand();
    try {
        platform.disableVerticalSwipes();
        platform.setHeaderColor('secondary_bg_color');
        platform.setBackgroundColor('bg_color');
    } catch {}
    let weatherGen = 0;
    let weatherKey = '';
    const applyWeather = async coords => {
        if (!coords) {
            weatherKey = '';
            jma = null;
            if (topic.value === 'japan') load();
            return;
        }
        if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) return;
        const key = `${coords.latitude.toFixed(2)},${coords.longitude.toFixed(2)}`;
        if (key === weatherKey) return;
        weatherKey = key;
        weatherGen += 1;
        const gen = weatherGen;
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
    const { requestLocation, syncWatch, fetchIp, setManual, resetManual } = createPlace({
        native,
        onCoords: applyWeather,
    });
    syncLocation = () => {
        const japan = topic.value === 'japan';
        if (!japan) {
            weatherKey = '';
            jma = null;
        }
        syncWatch(japan);
    };
    fetchIp();
    if (!navigator.geolocation?.watchPosition || topic.value !== 'japan') requestLocation();
    syncLocation();
    const pref = document.getElementById('diag-pref');
    pref.append(new Option('', ''), ...PREFECTURES.map(p => new Option(p.name, p.iso)));
    const syncPref = () => {
        if (getPlace().source === 'Manual') return;
        pref.value = prefectureFor(getPlace())?.iso || '';
    };
    watchPlace(syncPref);
    syncPref();
    document.getElementById('diag-ask').onclick = () => {
        platform.HapticFeedback?.selectionChanged();
        if (!resetManual()) requestLocation({ force: true });
    };
    pref.onchange = () => {
        platform.HapticFeedback?.selectionChanged();
        if (!pref.value) {
            resetManual();
            syncPref();
            return;
        }
        setManual(pref.value);
    };
    tg.MainButton.setText('LIVE NEWS');
    tg.MainButton.onClick(() => live.hidden ? setLive(true) : swapLang());
    tg.SecondaryButton?.onClick(setCameras);
    tg.BackButton?.onClick(() => setLive(false));
    syncLive();
}
load();
