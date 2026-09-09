import { articlesHtml, fetchClusters, fetchYesterday, render } from './feed.js';
import { quakeItems } from './jma-quake.js';
import { fetchWeatherAlerts, weatherItems, JmaRateLimit } from './jma-weather.js';
import { fetchCloudOutages } from './cloud-outages.js';
import { fetchFinanceSpikes } from './finance-spikes.js';
import { fetchFxRate } from './fx-rate.js';
import { createChrome } from './chrome.js';
import { createLive } from './live.js';
import { pipelineItems } from './pipeline.js';
import { createDiag } from './diag.js';
import { createPlace, getPlace, setPlace, watchPlace, PREFECTURES, prefectureFor } from './place.js';
import { TOKYO, inJapan } from './cameras.js';

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
let weatherKey = '';
let lastAlertCoords;
let japanBusy = false;
let japanQueued = false;

const JMA_DOWN = {
    en: 'JMA is not responding',
    es: 'JMA no responde',
    jp: 'JMAが応答しません',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

const retry = async fn => {
    try { return await fn(); } catch (e) { if (e instanceof JmaRateLimit) throw e; }
    await sleep(200);
    try { return await fn(); } catch (e) { if (e instanceof JmaRateLimit) throw e; }
    await sleep(400);
    return fn();
};

let jmaBgTimer = 0;
const scheduleJmaRetry = ms => {
    clearTimeout(jmaBgTimer);
    jmaBgTimer = setTimeout(() => {
        jmaBgTimer = 0;
        if (topic.value === 'japan') load();
    }, ms);
};

const tokyoCoords = () => ({ latitude: TOKYO[0], longitude: TOKYO[1] });
const japanCoords = coords => {
    if (!coords || !Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) return tokyoCoords();
    return inJapan(coords.latitude, coords.longitude) ? coords : tokyoCoords();
};
const coordsKey = coords => `${coords.latitude.toFixed(2)},${coords.longitude.toFixed(2)}`;

const offerAlertCoords = coords => {
    lastAlertCoords = coords && Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)
        ? { latitude: coords.latitude, longitude: coords.longitude }
        : null;
};

const jmaDownItem = lang => ({
    title: JMA_DOWN[lang] || JMA_DOWN.en,
    source: ['JMA'],
    cls: 'quake-high quake-recent',
    url: 'https://www.jma.go.jp/bosai/',
});


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
async function load() {
    loadGen += 1;
    const gen = loadGen;
    if (!(topic.value === 'japan' && feed.querySelector('article'))) {
        feed.innerHTML = '<div id="status">Loading…</div>';
    }
    syncDiag(topic.value === 'status');
    const outagesP = topic.value === 'tech' ? fetchCloudOutages(lang.value) : null;
    let items = [];
    try {
        if (topic.value === 'status') {
            items = await pipelineItems();
        } else if (topic.value === 'japan') {
            japanBusy = true;
            const coords = japanCoords(lastAlertCoords);
            const newsP = fetchClusters(topic.value, lang.value).catch(() => []);
            let quakeFail = false;
            let weatherFail = false;
            let rateMs = 0;
            const onJmaErr = e => {
                if (e instanceof JmaRateLimit) {
                    rateMs = Math.max(rateMs, e.retryAfterMs);
                    return true;
                }
                return false;
            };
            const quakeP = retry(() => quakeItems(lang.value)).catch(e => {
                if (!onJmaErr(e)) quakeFail = true;
                return [];
            });
            const weatherP = retry(() => fetchWeatherAlerts(coords)).then(w => {
                setPlace({ city: w.city, country: w.country });
                weatherKey = coordsKey(coords);
                return w;
            }).catch(e => {
                if (!onJmaErr(e)) weatherFail = true;
                return undefined;
            });
            const [news, quakes, weather] = await Promise.all([newsP, quakeP, weatherP]);
            if (gen !== loadGen) return;
            if (weather) jma = weather.alerts.length ? weather : null;
            items = news;
            if (jma?.alerts.length) items.unshift(...weatherItems(jma, lang.value));
            items.unshift(...quakes);
            if (rateMs) scheduleJmaRetry(rateMs);
            else if (quakeFail || weatherFail) items.unshift(jmaDownItem(lang.value));
        } else {
            items = await fetchClusters(topic.value, lang.value);
            if (topic.value === 'finance') {
                try { items.unshift(...await fetchFinanceSpikes(lang.value)); } catch {}
                try { items.unshift(...await fetchFxRate(lang.value)); } catch {}
            }
        }
    } catch {}
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
        if (gen !== loadGen || !prev.length) {
            finishJapan(gen);
            return;
        }
        feed.insertAdjacentHTML('beforeend', articlesHtml(prev));
    }
    finishJapan(gen);
}

const finishJapan = gen => {
    if (topic.value !== 'japan' || gen !== loadGen) return;
    japanBusy = false;
    if (japanQueued) {
        japanQueued = false;
        load();
    }
};

function onChange() {
    try { localStorage.setItem('nb', JSON.stringify({ t: topic.value, l: lang.value })); } catch {}
    syncHtmlLang();
    platform.HapticFeedback?.selectionChanged();
    syncLive();
    syncLocation();
    if (topic.value !== 'japan') clearTimeout(jmaBgTimer);
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
    const applyWeather = coords => {
        const waiting = lastAlertCoords === undefined;
        if (!coords) {
            offerAlertCoords(null);
            if (!waiting && topic.value === 'japan') {
                if (japanBusy) japanQueued = true;
                else load();
            }
            return;
        }
        if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) return;
        offerAlertCoords(coords);
        if (waiting) return;
        const key = coordsKey(japanCoords(coords));
        if (key === weatherKey) return;
        if (topic.value === 'japan') {
            if (japanBusy) japanQueued = true;
            else load();
            return;
        }
        weatherKey = key;
        void fetchWeatherAlerts(japanCoords(coords)).then(next => {
            setPlace({ city: next.city, country: next.country });
        }).catch(() => {
            if (weatherKey === key) weatherKey = '';
        });
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
