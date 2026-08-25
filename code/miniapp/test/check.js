import { createChrome } from '../chrome.js';
import { TOKYO, inJapan, nearest, nearestTwo, nextPage, pairAt } from '../cameras.js';

const scenario = new URLSearchParams(location.search).get('s') || 'feed';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));

const wait = async (fn, ms = 3000, msg = 'ready') => {
    const t = Date.now();
    while (Date.now() - t < ms) {
        if (fn()) return true;
        await sleep(20);
    }
    if (msg) ok(false, msg);
    return false;
};

const log = [];
const ok = (cond, msg) => { log.push(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); };
let sawEnd = false;

const articles = () => $$('#feed article');
const titles = () => articles().map(a => $('h2', a).textContent.trim());
const classes = () => articles().map(a => a.className.trim());
const sources = () => articles().map(a => $('.sources', a).textContent);
const href = a => (a.getAttribute('onclick') || '').match(/window\.open\('([^']*)'/)?.[1] || '';
const mapsQuery = a => {
    try { return new URL(href(a)).searchParams.get('query') || ''; }
    catch { return ''; }
};

const CHROME = {
    closed: { main: 'LIVE NEWS', secondary: null, back: false },
    news: { main: 'SWITCH TO ENGLISH', secondary: 'LIVE CAMERAS', back: true },
    newsEn: { main: 'SWITCH TO JAPANESE', secondary: 'LIVE CAMERAS', back: true },
    cameras: { main: 'NEXT', secondary: 'BACK TO NEWS BUCKET', back: true },
};
const readHtmlChrome = () => ({
    main: $('#MainButton').textContent,
    secondary: $('#SecondaryButton').hidden ? null : $('#SecondaryButton').textContent,
    back: !$('#BackButton').hidden,
});
const readNativeChrome = () => {
    const { MainButton: m, SecondaryButton: s, BackButton: b } = globalThis.Telegram.WebApp;
    return { main: m.text, secondary: s.isVisible ? s.text : null, back: b.isVisible };
};
const sameChrome = (got, exp, label) => {
    ok(got.main === exp.main, `${label} main`);
    ok(got.secondary === exp.secondary, `${label} secondary`);
    ok(got.back === exp.back, `${label} back`);
};
const htmlChromeApi = {
    main: () => $('#MainButton').click(),
    secondary: () => $('#SecondaryButton').click(),
    back: () => $('#BackButton').click(),
    read: readHtmlChrome,
    primaryRight: () => $('#SecondaryButton').hidden
        || $('#MainButton').getBoundingClientRect().left > $('#SecondaryButton').getBoundingClientRect().left,
};
const nativeChromeApi = {
    main: () => globalThis.Telegram.WebApp.MainButton.click(),
    secondary: () => globalThis.Telegram.WebApp.SecondaryButton.click(),
    back: () => globalThis.Telegram.WebApp.BackButton.click(),
    read: readNativeChrome,
    primaryRight: () => globalThis.Telegram.WebApp.SecondaryButton.position === 'left',
};
const walkLiveChrome = async (api, tag) => {
    sameChrome(api.read(), CHROME.closed, `${tag} closed`);
    api.main();
    if (!await wait(() => !$('#live').hidden, 3000, `${tag} open`)) return;
    sameChrome(api.read(), CHROME.news, `${tag} news`);
    ok(api.primaryRight(), `${tag} primary right`);
    api.main();
    if (!await wait(() => api.read().main.includes('JAPANESE'), 3000, `${tag} en`)) return;
    sameChrome(api.read(), CHROME.newsEn, `${tag} en`);
    api.secondary();
    if (!await wait(() => api.read().main === 'NEXT', 3000, `${tag} cameras`)) return;
    sameChrome(api.read(), CHROME.cameras, `${tag} cameras`);
    ok(api.primaryRight(), `${tag} primary right cameras`);
    api.secondary();
    if (!await wait(() => api.read().main.includes('JAPANESE'), 3000, `${tag} news again`)) return;
    sameChrome(api.read(), CHROME.newsEn, `${tag} news keeps lang`);
    api.back();
    if (!await wait(() => $('#live').hidden, 3000, `${tag} back`)) return;
    sameChrome(api.read(), CHROME.closed, `${tag} closed again`);
};

const COUNT = {
    empty: 0,
    fresh: 1,
    feed: 3,
    'feed-es': 3,
    'feed-click': 3,
    lang: 3,
    'lang-es': 1,
    'lang-ja': 1,
    'lang-en': 1,
    'lang-ua': 1,
    'lang-ua-ja': 1,
    'lang-uscore': 1,
    'lang-nav': 1,
    'lang-default': 1,
    'lang-bad-nb': 1,
    'lang-keep': 1,
    'feed-count': 2,
    'feed-nosource': 2,
    'topic-switch': 3,
    'lang-switch': 3,
    'end-mark': 3,
    yesterday: 4,
    'yesterday-stale': 3,
    'yesterday-sha': 4,
    'yesterday-lang': 4,
    'yesterday-topic': 4,
    'yesterday-fail': 3,
    'yesterday-one': 3,
    'yesterday-jp': 4,
    'yesterday-retry': 3,
    'quake-west': 1,
    'quake-down': 1,
    'weather-down': 1,
    'weather-c20': 1,
    'weather-html': 1,
    'weather-city': 5,
    'weather-tg': 0,
    'weather-level': 1,
    'weather-stale': 3,
    'weather-nolm': 3,
    'weather-no-c20': 1,
    'weather-panel': 1,
    'status-ok': 5,
    'status-running': 5,
    'status-fail': 5,
    'status-empty': 0,
    'status-mixed': 5,
    'status-leave': 5,
    'status-cache': 5,
    'status-post': 5,
    'watch-stop': 0,
    diag: 5,
    'diag-gps': 5,
    'diag-ip-gps': 5,
    'diag-none': 5,
    'diag-denied': 5,
    'diag-ask': 5,
    'diag-github': 5,
    'diag-403': 5,
    'diag-coords': 5,
    'diag-telegram': 5,
    'diag-timeout': 5,
    'diag-nogeo': 5,
    'diag-gps-city': 5,
    'haptic-tg': 3,
    quakes: 2,
    'quake-mag': 1,
    'quake-age': 1,
    'quake-blink': 2,
    'quake-drop': 2,
    'quake-combo': 2,
    'quake-cod': 2,
    'quake-bad-cod': 1,
    weather: 3,
    'weather-l2': 1,
    'weather-l10': 1,
    'weather-jp': 3,
    'weather-ip': 3,
    'geo-wins': 3,
    'geo-refresh': 3,
    'weather-osaka': 1,
    'weather-hokkaido': 2,
    'japan-jp': 6,
    'japan-us': 3,
    'japan-es': 6,
    mix: 6,
    live: 0,
    'live-open': 0,
    'live-yt': 0,
    'live-en': 0,
    'live-back': 0,
    'live-topic': 0,
    'live-cameras': 0,
    'live-next': 0,
    'live-cams-news': 0,
    'live-reopen': 0,
    'live-tg': 0,
    'live-web': 0,
    'cams-cache': 0,
    cameras: 3,
    chrome: 3,
};

const ready = async () => {
    if (scenario === 'loading') {
        await sleep(80);
        return;
    }
    if (scenario === 'stale-load') {
        $('#topic').value = 'tech';
        $('#topic').dispatchEvent(new Event('change'));
        await wait(() => titles()[0] === 'Foundry wins contract');
        return;
    }
    await wait(() => !$('#status') || $('#status').textContent !== 'Loading…');
    const n = COUNT[scenario];
    if (n) await wait(() => articles().length >= n);
    if (scenario === 'topic-switch') {
        $('#topic').value = 'tech';
        $('#topic').dispatchEvent(new Event('change'));
        await wait(() => titles()[0] === 'Foundry wins contract');
    }
    if (scenario === 'lang-switch') {
        $('#lang').value = 'es';
        $('#lang').dispatchEvent(new Event('change'));
        await wait(() => titles()[0] === 'Cuatro medios sobre tipos');
    }
    if (scenario === 'end-mark') {
        sawEnd = await wait(() => $('#feed p')?.textContent === 'YESTERDAY', 3000, '');
        $('#topic').value = 'status';
        $('#topic').dispatchEvent(new Event('change'));
        await wait(() => articles().length >= 5 && !$('#feed p'));
    }
    if (scenario === 'yesterday-stale') {
        await wait(() => $('#feed p')?.textContent === 'YESTERDAY');
        $('#topic').value = 'tech';
        $('#topic').dispatchEvent(new Event('change'));
        await wait(() => titles()[0] === 'Foundry wins contract');
        await sleep(300);
    }
    if (scenario === 'yesterday-lang') {
        await wait(() => $('#feed p')?.nextElementSibling?.querySelector('h2')?.textContent === 'Yesterday rates');
        $('#lang').value = 'es';
        $('#lang').dispatchEvent(new Event('change'));
        await wait(() => titles()[0] === 'Cuatro medios sobre tipos'
            && $('#feed p')?.nextElementSibling?.querySelector('h2')?.textContent === 'Tipos de ayer');
    }
    if (scenario === 'yesterday-topic') {
        await wait(() => $('#feed p')?.nextElementSibling?.querySelector('h2')?.textContent === 'Yesterday rates');
        $('#topic').value = 'tech';
        $('#topic').dispatchEvent(new Event('change'));
        await wait(() => titles()[0] === 'Foundry wins contract'
            && $('#feed p')?.nextElementSibling?.querySelector('h2')?.textContent === 'Yesterday chips');
    }
    if (scenario === 'yesterday-fail' || scenario === 'yesterday-one') {
        await wait(() => $('#feed p')?.textContent === 'YESTERDAY');
    }
    if (scenario === 'yesterday-jp') {
        await wait(() => $('#feed p')?.textContent === '昨日');
    }
    if (scenario === 'yesterday-retry') {
        await wait(() => $('#feed p')?.textContent === 'YESTERDAY' && !$('#feed p')?.nextElementSibling);
        $('#lang').value = 'es';
        $('#lang').dispatchEvent(new Event('change'));
        await wait(() => $('#feed p')?.nextElementSibling?.querySelector('h2')?.textContent === 'Tipos de ayer');
    }
    if (scenario === 'weather-no-c20') {
        await wait(() => articles().length === 1 && titles()[0]?.includes('Heavy rain'));
    }
    if (scenario === 'weather-down') await sleep(180);
    if (scenario === 'weather-stale') await sleep(80);
    if (scenario === 'weather-city') {
        await wait(() => $('#diag-place').textContent.includes('Shibuya'));
    }
    if (scenario === 'weather-tg') await sleep(180);
    if (scenario === 'status-leave') {
        $('#topic').value = 'finance';
        $('#topic').dispatchEvent(new Event('change'));
        await wait(() => $('#diag').hidden && articles().length >= 3);
    }
    if (scenario === 'watch-stop') {
        await wait(() => !$('#status') || $('#status').textContent !== 'Loading…');
        $('#topic').value = 'status';
        $('#topic').dispatchEvent(new Event('change'));
        await wait(() => !$('#diag').hidden && $('#diag-github').textContent !== '—');
        await sleep(450);
    }
    if (scenario === 'haptic-tg') {
        window.Telegram.WebApp.haptic.selection = 0;
        $('#lang').value = 'es';
        $('#lang').dispatchEvent(new Event('change'));
        await wait(() => window.Telegram.WebApp.haptic.selection > 0
            && titles()[0] === 'Cuatro medios sobre tipos');
    }
    if ((scenario.startsWith('live') && scenario !== 'live-tg') || scenario === 'cams-cache') await wait(() => !$('#chrome').hidden);
    if (scenario === 'live-tg') {
        await wait(() => globalThis.Telegram.WebApp.MainButton.isVisible, 3000, 'native main');
        await walkLiveChrome(nativeChromeApi, 'tg');
    }
    if (scenario === 'live-web') await walkLiveChrome(htmlChromeApi, 'web');
    if (scenario === 'live-yt') await wait(() => $('#liveFrame')?.dataset.vid);
    if (scenario.startsWith('diag')) {
        await wait(() => $('#diag-github').textContent !== '—');
        if (scenario === 'diag') await wait(() => $('#diag-place').textContent.includes('Tokyo'));
        if (scenario === 'diag-gps') {
            await wait(() => $('#diag-place').textContent.includes('Browser') && $('#diag-place').textContent.includes('Tokyo') && $('#diag-ip').textContent === '198.51.100.8');
        }
        if (scenario === 'diag-ip-gps') {
            await wait(() => $('#diag-place').textContent.includes('Browser') && $('#diag-place').textContent.includes('Osaka'));
        }
        if (scenario === 'diag-denied') await wait(() => $('#diag-geo').textContent === 'rejected');
        if (scenario === 'diag-ask') {
            await wait(() => $('#diag-geo').textContent === 'rejected');
            $('#diag-ask').click();
            await wait(() => $('#diag-geo').textContent === 'approved');
        }
        if (scenario === 'diag-github' || scenario === 'diag-403') {
            await wait(() => $('#diag-github').textContent.includes('rate limit'));
        }
        if (scenario === 'diag-coords') {
            await wait(() => $('#diag-place').textContent.includes('35.680'));
        }
        if (scenario === 'diag-telegram') {
            await wait(() => $('#diag-place').textContent.includes('Telegram'));
        }
        if (scenario === 'diag-gps-city') {
            await wait(() => $('#diag-place').textContent.includes('Browser') && $('#diag-place').textContent.includes('Tokyo'));
        }
    }
    const openLive = ['live-open', 'live-en', 'live-back', 'live-cameras', 'live-next', 'live-cams-news', 'live-reopen', 'cams-cache'];
    if (openLive.includes(scenario)) {
        $('#MainButton').click();
        await wait(() => !$('#live').hidden);
    }
    if (scenario === 'live-cameras' || scenario === 'live-next' || scenario === 'live-cams-news' || scenario === 'cams-cache') {
        $('#SecondaryButton').click();
        await wait(() => $('#MainButton').textContent === 'NEXT');
        await wait(() => $('#liveFrame').dataset.vid);
    }
    if (scenario === 'live-next') {
        const first = $('#liveFrame').dataset.vid;
        $('#MainButton').click();
        await wait(() => $('#liveFrame').dataset.vid && $('#liveFrame').dataset.vid !== first);
    }
    if (scenario === 'live-cams-news') {
        $('#SecondaryButton').click();
        await wait(() => $('#MainButton').textContent === 'SWITCH TO ENGLISH');
    }
    if (scenario === 'live-en' || scenario === 'live-reopen') {
        $('#MainButton').click();
        await wait(() => $('#MainButton').textContent.includes('JAPANESE'));
    }
    if (scenario === 'live-back') {
        $('#BackButton').click();
        await wait(() => $('#live').hidden);
    }
    if (scenario === 'live-reopen') {
        $('#BackButton').click();
        await wait(() => $('#live').hidden);
        $('#MainButton').click();
        await wait(() => !$('#live').hidden && $('#MainButton').textContent.includes('ENGLISH'));
    }
    if (scenario === 'live-topic') {
        await wait(() => !$('#chrome').hidden);
        $('#topic').value = 'finance';
        $('#topic').dispatchEvent(new Event('change'));
        await wait(() => articles().length >= 3 && $('#chrome').hidden);
    }
};

const run = () => {
    if (scenario === 'loading') {
        ok($('#status')?.textContent === 'Loading…', 'Loading…');
        ok(!articles().length, 'no articles');
        return;
    }
    if (scenario === 'fresh') {
        ok($('#topic').value === 'japan', 'default japan');
        return;
    }
    if (scenario === 'empty' || scenario === 'status-empty' || scenario === 'feed-down') {
        ok($('#status')?.textContent === 'No news', 'No news');
        if (scenario === 'status-empty') ok(!$('#diag').hidden, 'diag on');
        return;
    }
    if (scenario === 'feed') {
        ok(articles().length === 3, '3 articles');
        ok(classes().join() === 'high,medium,low', 'tiers high medium low');
        ok(getComputedStyle(articles()[0]).borderColor === 'rgb(255, 59, 48)', 'high #ff3b30');
        ok(getComputedStyle(articles()[1]).borderColor === 'rgb(241, 196, 15)', 'medium #f1c40f');
        ok(getComputedStyle(articles()[2]).borderColor === 'rgb(136, 136, 136)', 'low #888');
        ok(getComputedStyle($('.sources', articles()[0])).opacity === '0.65', 'sources fade');
        ok(titles()[0] === 'Four outlets on rates', 'title');
        ok(articles().every(a => $('.sources', a).textContent.includes(' · ')), 'sources ·');
        ok(articles().every(a => !a.getAttribute('onclick')), 'no onclick');
        ok($('#diag').hidden, 'diag hidden');
        ok($('#chrome').hidden, 'chrome hidden');
        ok($('#live').hidden, 'live hidden');
        return;
    }
    if (scenario === 'feed-es') {
        ok($('#lang').value === 'es', 'lang es');
        ok(titles()[0] === 'Cuatro medios sobre tipos', 'es title');
        return;
    }
    if (scenario === 'feed-click') {
        ok(articles()[0].getAttribute('onclick')?.includes('https://example.com/rates'), 'onclick url');
        ok(!articles()[1].getAttribute('onclick'), 'rest plain');
        return;
    }
    if (scenario === 'lang') {
        ok($('#lang').value === 'jp', 'lang jp');
        ok(titles()[0] === '金利を4社が報道', 'jp title');
        return;
    }
    if (scenario === 'lang-es') {
        ok($('#lang').value === 'es', 'system es');
        ok(titles()[0] === 'La Dieta aprueba el proyecto', 'es news');
        return;
    }
    if (scenario === 'lang-ja') {
        ok($('#lang').value === 'jp', 'system ja');
        ok(titles()[0] === '国会が法案を可決', 'jp news');
        return;
    }
    if (scenario === 'lang-en') {
        ok($('#lang').value === 'en', 'system en');
        ok(titles()[0] === 'Diet passes bill', 'en news');
        return;
    }
    if (scenario === 'lang-ua') {
        ok($('#lang').value === 'es', 'ua es');
        ok(titles()[0] === 'La Dieta aprueba el proyecto', 'es news');
        return;
    }
    if (scenario === 'lang-ua-ja') {
        ok($('#lang').value === 'jp', 'ua ja');
        ok(titles()[0] === '国会が法案を可決', 'jp news');
        return;
    }
    if (scenario === 'lang-uscore') {
        ok($('#lang').value === 'es', 'es_MX');
        ok(titles()[0] === 'La Dieta aprueba el proyecto', 'es news');
        return;
    }
    if (scenario === 'lang-nav') {
        ok($('#lang').value === 'jp', 'navigator.language ja');
        ok(titles()[0] === '国会が法案を可決', 'jp news');
        return;
    }
    if (scenario === 'lang-default' || scenario === 'lang-bad-nb') {
        ok($('#lang').value === 'en', scenario === 'lang-bad-nb' ? 'bad nb → autoLang' : 'default en');
        ok(titles()[0] === 'Diet passes bill', 'en news');
        return;
    }
    if (scenario === 'lang-keep') {
        ok($('#lang').value === 'jp', 'saved beats system');
        ok(titles()[0] === '国会が法案を可決', 'jp news');
        return;
    }
    if (scenario === 'status-ok') {
        ok(titles().join() === 'Tech digest,Finance digest,Gaming digest,Japan digest,Translated editions', '5 jobs');
        ok(classes().every(c => c === 'ok'), 'all ok');
        ok(sources()[0].includes('45s'), '45s');
        ok(sources()[1].includes('3m') && !sources()[1].includes('s'), '3m');
        ok(sources()[2].includes('1m 30s'), '1m 30s');
        ok(articles().every(a => a.getAttribute('onclick')), 'job urls');
        ok(sources().every(s => /\d/.test(s)), 'stamp');
        return;
    }
    if (scenario === 'status-running') {
        ok(articles().length === 5, '5 jobs');
        ok(classes().every(c => c === 'running'), 'all running');
        ok(articles().every(a => href(a).includes('/actions/runs/1')), 'run url');
        ok(sources().every(s => /\d/.test(s)), 'run stamp');
        return;
    }
    if (scenario === 'feed-count') {
        ok(articles().length === 2, '2 articles');
        ok(classes().join() === 'high,low', 'count from sources');
        ok(titles().join() === 'Four sources,Two sources', 'titles');
        return;
    }
    if (scenario === 'feed-nosource') {
        const orphan = articles().find(a => $('h2', a).textContent === 'Orphan headline');
        ok(orphan, 'renders without source');
        ok($('.sources', orphan).textContent === '', 'empty sources');
        ok(titles().includes('Two sources'), 'sibling kept');
        return;
    }
    if (scenario === 'topic-switch') {
        ok($('#topic').value === 'tech', 'topic tech');
        ok(titles()[0] === 'Foundry wins contract', 'tech feed');
        ok(JSON.parse(localStorage.getItem('nb')).t === 'tech', 'saved topic');
        return;
    }
    if (scenario === 'stale-load') {
        ok(titles()[0] === 'Foundry wins contract', 'second wins');
        ok(!titles().some(t => t.includes('Four outlets')), 'stale finance dropped');
        return;
    }
    if (scenario === 'lang-switch') {
        ok($('#lang').value === 'es', 'lang es');
        ok(titles()[0] === 'Cuatro medios sobre tipos', 'es feed');
        ok(JSON.parse(localStorage.getItem('nb')).l === 'es', 'saved lang');
        return;
    }
    if (scenario === 'end-mark') {
        ok(sawEnd, 'end on news');
        ok($('#topic').value === 'status', 'status');
        ok(!$('#feed p'), 'no end on status');
        ok(articles().length === 5, '5 jobs');
        return;
    }
    if (scenario === 'yesterday') {
        ok(articles().length === 4, '3 today + 1 yesterday');
        ok(titles().slice(0, 3).join() === 'Four outlets on rates,Three outlets on chips,Two outlets on apps', 'today first');
        ok($('#feed p')?.textContent === 'YESTERDAY', 'YESTERDAY');
        ok($('#feed p').nextElementSibling?.querySelector('h2')?.textContent === 'Yesterday rates', 'yesterday after END');
        return;
    }
    if (scenario === 'yesterday-stale') {
        ok($('#topic').value === 'tech', 'topic tech');
        ok(titles()[0] === 'Foundry wins contract', 'tech feed');
        ok(!titles().some(t => t === 'Yesterday rates'), 'late yesterday dropped');
        ok(!titles().some(t => t.includes('Four outlets')), 'finance gone');
        return;
    }
    if (scenario === 'yesterday-sha') {
        ok($('#feed p')?.nextElementSibling?.querySelector('h2')?.textContent === 'Yesterday rates', 'commits[1]');
        ok(!titles().includes('HEAD rates'), 'not commits[0]');
        return;
    }
    if (scenario === 'yesterday-lang') {
        ok($('#lang').value === 'es', 'lang es');
        ok($('#feed p')?.textContent === 'AYER', 'AYER');
        ok($('#feed p')?.nextElementSibling?.querySelector('h2')?.textContent === 'Tipos de ayer', 'es yesterday');
        ok(!titles().includes('Yesterday rates'), 'en yesterday gone');
        return;
    }
    if (scenario === 'yesterday-topic') {
        ok($('#topic').value === 'tech', 'topic tech');
        ok($('#feed p')?.nextElementSibling?.querySelector('h2')?.textContent === 'Yesterday chips', 'tech yesterday');
        ok(!titles().includes('Yesterday rates'), 'finance yesterday gone');
        return;
    }
    if (scenario === 'yesterday-empty') {
        ok($('#status')?.textContent === 'No news', 'No news');
        ok(!$('#feed p'), 'no END');
        ok(!titles().includes('Yesterday rates'), 'no yesterday');
        return;
    }
    if (scenario === 'yesterday-fail' || scenario === 'yesterday-one') {
        ok(articles().length === 3, 'today only');
        ok($('#feed p')?.textContent === 'YESTERDAY', 'YESTERDAY');
        ok(!$('#feed p')?.nextElementSibling, 'no yesterday');
        return;
    }
    if (scenario === 'yesterday-jp') {
        ok($('#feed p')?.textContent === '昨日', '昨日');
        ok($('#feed p').nextElementSibling?.querySelector('h2')?.textContent === 'Yesterday rates', 'yesterday after');
        return;
    }
    if (scenario === 'yesterday-retry') {
        ok($('#lang').value === 'es', 'retried es');
        ok($('#feed p')?.textContent === 'AYER', 'AYER');
        ok($('#feed p')?.nextElementSibling?.querySelector('h2')?.textContent === 'Tipos de ayer', 'second fetch');
        return;
    }
    if (scenario === 'status-fail') {
        const fail = articles().find(a => a.className === 'high');
        ok(fail, 'one high');
        ok($('h2', fail)?.textContent === 'Translated editions', 'fail job');
        ok($('.sources', fail).textContent.includes('Compile translations'), 'step name');
        ok(classes().filter(c => c === 'ok').length === 4, 'rest ok');
        return;
    }
    if (scenario === 'status-mixed') {
        ok(classes().join() === 'high,running,running,ok,ok', 'fail then running then ok');
        ok(titles()[0] === 'Japan digest', 'fail first');
        ok(sources()[0].includes('Compile translations'), 'step');
        ok(articles().filter(a => a.className === 'running').every(a => /\d+m/.test($('.sources', a).textContent)), 'elapsed');
        return;
    }
    if (scenario === 'status-leave') {
        ok($('#topic').value === 'finance', 'left status');
        ok($('#diag').hidden, 'diag off');
        ok(titles()[0] === 'Four outlets on rates', 'finance feed');
        return;
    }
    if (scenario === 'status-cache') {
        ok(articles().length === 5, 'cached jobs');
        ok(href(articles()[0]).includes('cached-job'), 'cached url');
        return;
    }
    if (scenario === 'status-post') {
        const fail = articles().find(a => a.className === 'high');
        ok($('.sources', fail).textContent.includes('Compile translations'), 'real step');
        ok(!$('.sources', fail).textContent.includes('Complete job'), 'skip Complete');
        ok(!$('.sources', fail).textContent.includes('Post Checkout'), 'skip Post');
        return;
    }
    if (scenario === 'watch-stop') {
        ok(!$('#diag').hidden, 'status');
        ok(!$('#diag-place').textContent.includes('Browser'), 'watch cleared');
        ok($('#diag-place').textContent.includes('IP'), 'ip only');
        return;
    }
    if (scenario.startsWith('diag')) {
        ok(!$('#diag').hidden, 'diag visible');
        ok($('#diag-cf').textContent.includes('ok'), 'cf ok');
        ok($('#diag-jma').textContent.includes('down'), 'jma down');
        if (scenario === 'diag-github' || scenario === 'diag-403') {
            ok($('#diag-github').textContent.includes('rate limit'), scenario === 'diag-403' ? 'github 403' : 'github 429');
            ok($('#diag-github').className === 'medium', 'rate color');
        } else ok($('#diag-github').textContent.includes('ok'), 'github 200');
        if (scenario === 'diag') {
            ok($('#diag-ip').textContent === '203.0.113.10', 'ip');
            ok($('#diag-place').textContent.includes('IP') && $('#diag-place').textContent.includes('Tokyo'), 'place IP');
            ok($('#diag-geo').textContent === 'unknown', 'unknown');
        }
        if (scenario === 'diag-gps') {
            ok($('#diag-place').textContent.includes('Tokyo') && $('#diag-place').textContent.includes('Browser'), 'gps place');
            ok(!$('#diag-place').textContent.includes('35.680'), 'no coords');
            ok($('#diag-ip').textContent === '198.51.100.8', 'late ip kept');
            ok(!$('#diag-place').textContent.includes('Dallas'), 'late ip did not replace gps');
            ok($('#diag-geo').textContent === 'approved', 'approved');
            ok($('#diag-geo').className === 'ok', 'approved color');
        }
        if (scenario === 'diag-ip-gps') {
            ok($('#diag-place').textContent.includes('Osaka') && $('#diag-place').textContent.includes('Browser'), 'late gps place');
            ok($('#diag-ip').textContent === '203.0.113.10', 'early ip kept');
            ok(!$('#diag-place').textContent.includes('Tokyo'), 'gps replaced ip location');
            ok($('#diag-geo').textContent === 'approved', 'approved');
        }
        if (scenario === 'diag-none') {
            ok($('#diag-place').textContent === '—', 'no place');
            ok($('#diag-ip').textContent === '—', 'no ip');
            ok($('#diag-geo').textContent === 'unknown', 'unknown');
        }
        if (scenario === 'diag-denied') {
            ok($('#diag-geo').textContent === 'rejected', 'rejected');
            ok($('#diag-geo').className === 'high', 'rejected color');
        }
        if (scenario === 'diag-ask') {
            ok($('#diag-geo').textContent === 'approved', 'ask grants');
            ok($('#diag-place').textContent.includes('Browser'), 'gps after ask');
        }
        if (scenario === 'diag-coords') {
            ok($('#diag-place').textContent.includes('35.680') && $('#diag-place').textContent.includes('139.760'), 'coords');
            ok($('#diag-place').textContent.includes('Browser'), 'browser');
        }
        if (scenario === 'diag-telegram') {
            ok($('#diag-place').textContent.includes('Telegram'), 'telegram');
            ok($('#diag-geo').textContent === 'approved', 'granted');
        }
        if (scenario === 'diag-gps-city') {
            ok($('#diag-place').textContent.includes('Tokyo') && $('#diag-place').textContent.includes('Browser'), 'ip city after gps');
            ok($('#diag-place').textContent.includes('Japan'), 'ip country after gps');
            ok($('#diag-ip').textContent === '203.0.113.10', 'ip kept');
            ok($('#diag-geo').textContent === 'approved', 'approved');
        }
        if (scenario === 'diag-timeout' || scenario === 'diag-nogeo') {
            ok($('#diag-geo').textContent === 'unknown', 'not rejected');
            ok($('#diag-place').textContent.includes('IP'), 'ip place');
        }
        ok($('#diag-cf').className === 'ok', 'cf color');
        if (scenario !== 'diag-github' && scenario !== 'diag-403') ok($('#diag-github').className === 'ok', 'github color');
        ok($('#diag-jma').className === 'high', 'jma color');
        ok($('#diag-ip').title === $('#diag-ip').textContent || $('#diag-ip').textContent === '—', 'ip title');
        return;
    }
    if (scenario === 'quakes') {
        ok(classes()[0] === 'quake-high quake-recent', 'recent <2h');
        ok(classes()[1] === 'quake-high', 'older <24h');
        ok(titles()[0].startsWith('M6.2') && titles()[0].includes('Tokyo Bay'), 'M6.2');
        ok(titles()[1].startsWith('M5.4'), 'M5.4');
        ok(titles().every(t => !t.includes('Weather alert')), 'no weather');
        ok(href(articles()[0]) === 'https://www.google.com/maps/search/?api=1&query=35.6,139.7', 'maps url');
        ok(sources()[0].includes('JMA'), 'JMA source');
        return;
    }
    if (scenario === 'quake-mag') {
        ok(articles().length === 1, 'only M≥4.5');
        ok(titles()[0].startsWith('M4.5') && titles()[0].includes('Floor'), 'floor kept');
        ok(!titles().some(t => t.includes('Below') || t.startsWith('M4.4')), 'M4.4 dropped');
        return;
    }
    if (scenario === 'quake-age') {
        ok(articles().length === 1, 'only <48h');
        ok(titles()[0].includes('Inside'), '47h kept');
        ok(!titles().some(t => t.includes('Outside')), '48h dropped');
        return;
    }
    if (scenario === 'quake-blink') {
        ok(classes()[0] === 'quake-high quake-recent', '1h blinks');
        ok(titles()[0].includes('Fresh'), 'fresh first');
        ok(classes()[1] === 'quake-high', '2h still');
        ok(titles()[1].includes('Stale'), 'stale second');
        return;
    }
    if (scenario === 'quake-combo') {
        ok(articles().length === 2, '2 kept');
        ok(titles()[0].startsWith('M6.0') && classes()[0] === 'quake-high quake-recent', 'hot blinks');
        ok(titles()[1].startsWith('M4.5') && classes()[1] === 'quake-high', 'edge still');
        ok(!titles().some(t => t.includes('Weak') || t.includes('Old')), 'weak/old dropped');
        return;
    }
    if (scenario === 'quake-drop') {
        ok(articles().length === 2, 'complete + no ctt');
        ok(titles().some(t => t.includes('Kept')), 'kept');
        ok(titles().some(t => t.includes('No ctt')), 'no ctt kept');
        ok(!titles().some(t => t.includes('No mag') || t.includes('No cod')), 'incomplete dropped');
        return;
    }
    if (scenario === 'quake-bad-cod') {
        ok(articles().length === 1, '1 quake');
        ok(titles()[0].includes('Kept'), 'valid kept');
        ok(!titles().some(t => t.includes('Broken') || t.includes('Half')), 'bad cod dropped');
        return;
    }
    if (scenario === 'quake-cod') {
        const ibaraki = articles().find(a => $('h2', a).textContent.includes('Ibaraki'));
        const urakawa = articles().find(a => $('h2', a).textContent.includes('Urakawa'));
        ok(ibaraki && $('h2', ibaraki).textContent.startsWith('M5.9'), 'compact bulletin wins');
        ok(!titles().some(t => t.includes('old decimal')), 'older eid dropped');
        const [lat, lon] = mapsQuery(ibaraki).split(',').map(Number);
        ok(Math.abs(lat - (35 + 59.9 / 60)) < 1e-3, 'compact lat');
        ok(Math.abs(lon - (140 + 5.7 / 60)) < 1e-3, 'compact lon');
        ok(href(ibaraki).startsWith('https://www.google.com/maps/search/?api=1&query='), 'maps url');
        ok(mapsQuery(urakawa) === '41.8,142.9', 'depth not lon');
        return;
    }
    if (scenario === 'quake-west') {
        ok(articles().length === 1, '1 quake');
        ok(titles()[0].includes('Central America'), 'west title');
        ok(mapsQuery(articles()[0]) === '5,-76.3', 'minus lon');
        ok(!href(articles()[0]).includes('+'), 'no plus');
        return;
    }
    if (scenario === 'quake-down') {
        ok(articles().length === 1, '1 news');
        ok(titles()[0] === 'Diet passes bill', 'news kept');
        ok(!titles().some(t => t.startsWith('M')), 'no quake');
        return;
    }
    if (scenario === 'weather' || scenario === 'weather-ip') {
        ok(titles()[0].includes('Heavy rain') && titles()[0].includes('Level 3'), 'rain L3');
        ok(titles()[1] === 'Weather alert: Flood', 'flood L1');
        ok(titles()[2].includes('Storm') && titles()[2].includes('Level 5'), 'storm L5');
        ok(sources()[0].includes('Tokyo'), 'Tokyo');
        ok(!titles().some(t => t.startsWith('M')), 'no quake');
        ok(classes()[0].includes('quake-recent'), 'L3 blinks');
        ok(!classes()[1].includes('quake-recent'), 'L1 still');
        ok(classes()[2].includes('quake-recent'), 'L5 blinks');
        if (scenario === 'weather-ip') ok(articles().length === 3, 'ip-only weather');
        ok(href(articles()[0]).includes('area_code=130000'), 'tokyo area');
        ok(!href(articles()[0]).includes('area_code=010000'), 'not nationwide');
        ok(sources()[0].includes('JMA') && sources()[0].includes('Tokyo'), 'JMA Tokyo');
        ok(href(articles()[0]).includes('#lang=en'), 'lang en');
        return;
    }
    if (scenario === 'weather-l2') {
        ok(articles().length === 1, '1 alert');
        ok(titles()[0].includes('Wind') && titles()[0].includes('Level 2'), 'L2 title');
        ok(!classes()[0].includes('quake-recent'), 'L2 still');
        return;
    }
    if (scenario === 'weather-l10') {
        ok(articles().length === 1, '1 alert');
        ok(titles()[0].includes('Special warning') && titles()[0].includes('Level 10'), 'numeric 10 wins');
        ok(!titles()[0].includes('Level 5'), 'lexical 8 lost');
        return;
    }
    if (scenario === 'weather-jp') {
        ok(titles()[0].includes('大雨') && titles()[0].includes('レベル3'), '雨');
        ok(titles()[1] === '気象警報: 洪水', '洪水');
        ok(titles()[2].includes('暴風') && titles()[2].includes('レベル5'), '暴風');
        ok(classes()[0].includes('quake-recent') && !classes()[1].includes('quake-recent') && classes()[2].includes('quake-recent'), 'jp blink');
        ok(href(articles()[0]).includes('#lang=jp'), 'lang jp');
        return;
    }
    if (scenario === 'weather-down') {
        ok(articles().length === 1, '1 news');
        ok(titles()[0] === 'Diet passes bill', 'news kept');
        ok(!titles().some(t => t.includes('Weather')), 'no weather');
        return;
    }
    if (scenario === 'weather-hokkaido') {
        ok(articles().length === 2, '2 alerts');
        ok(sources().every(s => s.includes('Hokkaido')), 'Hokkaido');
        ok(href(articles()[0]).includes('area_code=016000'), 'sapporo office');
        ok(href(articles()[1]).includes('area_code=014030'), 'tokachi office');
        ok(articles().every(a => !href(a).includes('area_code=011000') && !href(a).includes('area_code=010000')), 'not first/nationwide');
        return;
    }
    if (scenario === 'weather-osaka') {
        ok(articles().length === 1, '1 alert');
        ok(titles()[0].includes('Storm') && titles()[0].includes('Level 5'), 'storm');
        ok(sources()[0].includes('Osaka'), 'Osaka');
        ok(classes()[0].includes('quake-recent'), 'L5 blinks');
        ok(href(articles()[0]).includes('area_code=270000'), 'osaka area');
        ok(!href(articles()[0]).includes('area_code=010000'), 'not nationwide');
        return;
    }
    if (scenario === 'japan-jp') {
        ok(titles()[0].includes('東京湾'), 'anm');
        ok(titles()[2].startsWith('気象警報: 大雨') && titles()[2].includes('レベル3'), '雨');
        ok(titles()[3] === '気象警報: 洪水', '洪水');
        ok(titles()[4].includes('暴風') && titles()[4].includes('レベル5'), '暴風');
        ok(titles()[5] === '国会が法案を可決', 'news jp');
        return;
    }
    if (scenario === 'japan-es') {
        ok(titles()[0].includes('Tokyo Bay') && titles()[1].includes('Osaka Bay'), 'quakes en');
        ok(titles()[2].includes('Heavy rain') && titles()[4].includes('Storm'), 'weather en');
        ok(titles()[5] === 'La Dieta aprueba el proyecto', 'news es');
        ok(href(articles()[2]).includes('#lang=en'), 'weather es uses en');
        return;
    }
    if (scenario === 'japan-us') {
        ok(titles()[0].startsWith('M6.2') && titles()[1].startsWith('M5.4'), 'quakes are global');
        ok(titles()[2] === 'Diet passes bill', 'news');
        ok(!titles().some(t => t.includes('Weather')), 'no local weather');
        return;
    }
    if (scenario === 'geo-wins') {
        ok(articles().length === 3 && sources().every(s => s.includes('Tokyo')), 'gps weather');
        return sleep(180).then(() => {
            ok(articles().length === 3 && sources().every(s => s.includes('Tokyo')), 'stale Osaka result discarded');
        });
    }
    if (scenario === 'geo-refresh') {
        ok(articles().length === 3 && sources().every(s => s.includes('Tokyo')), 'IP weather shown first');
        return sleep(400).then(() => {
            ok(articles().length === 0, 'precise location clears stale IP weather');
            ok($('#status')?.textContent === 'No news', 'Nagoya empty state rendered');
        });
    }
    if (scenario === 'mix') {
        ok(articles().length === 6, '6 items');
        ok(titles()[0].startsWith('M6.2') && titles()[1].startsWith('M5.4'), 'quakes first');
        ok(titles()[2].includes('Heavy rain') && titles()[4].includes('Storm'), 'weather types');
        ok(titles()[5] === 'Diet passes bill', 'news last');
        return;
    }
    if (scenario === 'haptic-tg') {
        ok(window.Telegram.WebApp.haptic.selection > 0, 'native haptic');
        ok(titles()[0] === 'Cuatro medios sobre tipos', 'es after change');
        return;
    }
    if (scenario === 'weather-nolm') {
        ok(titles()[0].includes('Heavy rain'), 'browser geo without LocationManager');
        ok(sources()[0].includes('Tokyo'), 'tokyo');
        return;
    }
    if (scenario === 'weather-no-c20') {
        ok(articles().length === 1, 'class10 without class20s');
        ok(titles()[0].includes('Heavy rain'), 'rain');
        return;
    }
    if (scenario === 'weather-panel') {
        ok(articles().length === 1, 'live panel kept');
        ok(titles()[0].includes('Heavy rain'), 'rain');
        ok(!titles().some(t => t.includes('Storm')), 'dead panel dropped');
        return;
    }
    if (scenario === 'weather-c20') {
        ok(articles().length === 1, 'class20 hit');
        ok(titles()[0].includes('Heavy rain'), 'rain');
        ok(href(articles()[0]).includes('area_code=130000'), 'tokyo office');
        return;
    }
    if (scenario === 'weather-html') {
        ok(articles().length === 1, 'dropped missing jp');
        ok(titles()[0].includes('Heavy rain') && titles()[0].includes('Level 3'), 'nfkc + strip');
        ok(!titles().some(t => t.includes('Flood')), 'no flood');
        return;
    }
    if (scenario === 'weather-city') {
        ok($('#diag-place').textContent.includes('Shibuya'), 'locality');
        ok($('#diag-place').textContent.includes('Japan'), 'countryName');
        return;
    }
    if (scenario === 'weather-tg') {
        ok(!titles().some(t => t.includes('Weather')), 'ip weather skipped');
        return;
    }
    if (scenario === 'weather-level') {
        ok(articles().length === 1, '1 type');
        ok(titles()[0].includes('Rain') && titles()[0].includes('Level 5'), 'highest wins');
        return;
    }
    if (scenario === 'weather-stale') {
        ok(articles().length === 3 && sources().every(s => s.includes('Tokyo')), 'tokyo kept');
        return sleep(350).then(() => {
            ok(articles().length === 3 && sources().every(s => s.includes('Tokyo')), 'failed nagoya discarded');
        });
    }
    if (scenario === 'live') {
        ok(!window.Telegram?.WebApp?.initData, 'no telegram');
        ok(!$('#chrome').hidden, 'chrome on');
        ok($('#live').hidden, 'live off');
        sameChrome(readHtmlChrome(), CHROME.closed, 'html closed');
        ok($('#MainButton').classList.contains('ring'), 'ring on');
        return;
    }
    if (scenario === 'live-yt') {
        ok($('#liveFrame').dataset.vid, 'window.YT.Player primary');
        ok($('#liveSecondFrame').dataset.vid, 'window.YT.Player second');
        return;
    }
    if (scenario === 'live-open') {
        ok(!$('#live').hidden, 'overlay');
        sameChrome(readHtmlChrome(), CHROME.news, 'html news');
        ok($('#MainButton').getBoundingClientRect().left > $('#SecondaryButton').getBoundingClientRect().left, 'primary right');
        ok(!$('#MainButton').classList.contains('ring'), 'ring off');
        ok($('#liveFrame').dataset.vid === 'Anr15FA9OCI', 'jp news');
        ok($('#liveSecondFrame').dataset.vid === 'HXGANE2pRrA', 'second');
        ok($('#liveFrame').dataset.vol === '100' && $('#liveSecondFrame').dataset.vol === '50', 'volumes');
        ok($('#liveFrame').dataset.muted === '1' && $('#liveSecondFrame').dataset.muted === '1', 'muted');
        ok($('#liveFrame').dataset.playing === '1' && $('#liveSecondFrame').dataset.playing === '1', 'playing');
        ok($('#liveFrame').dataset.loads === '0' && $('#liveSecondFrame').dataset.loads === '0', 'already cued');
        ok(document.body.style.getPropertyValue('--chrome-h'), 'chrome-h');
        const live = $('#live').getBoundingClientRect();
        const chrome = $('#chrome').getBoundingClientRect();
        const pad = parseFloat(getComputedStyle($('#live')).paddingBottom);
        ok(Math.abs(live.bottom - pad - chrome.top) < 1, 'live meets chrome');
        ok(getComputedStyle(document.body).overflow === 'hidden', 'scroll locked');
        ok(getComputedStyle($('.live-player')).backgroundColor === 'rgb(0, 0, 0)', 'player opaque');
        const slot = $('.live-player');
        const fake = slot.appendChild(document.createElement('iframe'));
        const ir = fake.getBoundingClientRect();
        const sr = slot.getBoundingClientRect();
        ok(ir.width <= sr.width + 1 && ir.height <= sr.height + 1, 'iframe fits slot');
        ok(Math.abs((ir.left + ir.right) / 2 - (sr.left + sr.right) / 2) < 2, 'iframe centered x');
        ok(Math.abs((ir.top + ir.bottom) / 2 - (sr.top + sr.bottom) / 2) < 2, 'iframe centered y');
        return;
    }
    if (scenario === 'live-en') {
        ok(!$('#live').hidden, 'overlay');
        sameChrome(readHtmlChrome(), CHROME.newsEn, 'html en');
        ok($('#liveFrame').dataset.vid === 'f0lYkdA-Gtw', 'en news');
        ok($('#liveFrame').dataset.loads === '1', 'switched');
        ok($('#liveFrame').dataset.muted === '1' && $('#liveFrame').dataset.playing === '1', 'muted play');
        return;
    }
    if (scenario === 'live-back') {
        ok($('#live').hidden, 'closed');
        sameChrome(readHtmlChrome(), CHROME.closed, 'html closed');
        ok($('#MainButton').classList.contains('ring'), 'ring back');
        ok($('#liveFrame').dataset.playing === '0', 'stopped');
        ok(!document.body.style.getPropertyValue('--chrome-h'), 'chrome-h off');
        return;
    }
    if (scenario === 'live-cameras') {
        ok(!$('#live').hidden, 'overlay');
        sameChrome(readHtmlChrome(), CHROME.cameras, 'html cameras');
        ok($('#liveFrame').dataset.vid === 'near1', 'nearest');
        ok($('#liveSecondFrame').dataset.vid === 'near2', 'second nearest');
        ok($('#liveFrame').dataset.loads === '1' && $('#liveSecondFrame').dataset.loads === '1', 'loaded cams');
        ok($('#liveFrame').dataset.muted === '1' && $('#liveFrame').dataset.playing === '1', 'muted play');
        return;
    }
    if (scenario === 'live-next') {
        ok($('#liveFrame').dataset.vid === 'far', 'page 2');
        ok($('#liveSecondFrame').dataset.playing === '0', 'odd page stops second');
        return;
    }
    if (scenario === 'live-cams-news') {
        sameChrome(readHtmlChrome(), CHROME.news, 'html news');
        ok($('#liveFrame').dataset.vid === 'Anr15FA9OCI', 'news id');
        return;
    }
    if (scenario === 'live-reopen') {
        ok(!$('#live').hidden, 'reopened');
        sameChrome(readHtmlChrome(), CHROME.news, 'html reopen');
        ok($('#liveFrame').dataset.vid === 'Anr15FA9OCI', 'jp id');
        ok($('#liveFrame').dataset.muted === '1' && $('#liveFrame').dataset.playing === '1', 'muted play');
        return;
    }
    if (scenario === 'live-tg') {
        ok($('#chrome').hidden, 'html chrome off');
        ok($('#live').hidden, 'closed');
        ok(globalThis.Telegram.WebApp.SecondaryButton.position === 'left', 'native secondary left');
        return;
    }
    if (scenario === 'live-web') {
        const main = globalThis.Telegram.WebApp.MainButton;
        ok(!globalThis.Telegram.WebApp.initData, 'empty initData');
        ok(!$('#chrome').hidden, 'html chrome');
        ok($('#MainButton').textContent === 'LIVE NEWS', 'fake LIVE NEWS');
        ok(!main.isVisible && !main.text, 'native unused');
        return;
    }
    if (scenario === 'cams-cache') {
        ok($('#liveFrame').dataset.vid === 'cached1', 'cached first');
        ok($('#liveSecondFrame').dataset.vid === 'cached2', 'cached second');
        return;
    }
    if (scenario === 'live-topic') {
        ok($('#topic').value === 'finance', 'left japan');
        ok($('#chrome').hidden, 'chrome off');
        ok(titles()[0] === 'Four outlets on rates', 'finance feed');
        ok($('#live').hidden, 'live off');
        return;
    }
    if (scenario === 'cameras') {
        const spot = (video_id, lat, lng, is_live = true) => ({ video_id, lat, lng, is_live });
        const ids = (spots, lat, lng) => nearestTwo(spots, lat, lng).map(s => s.video_id);
        const station = spot('ZN4gh5IOowM', 35.68121, 139.76478);
        const shibuya = spot('EaRgJQ--2eE', 35.6605, 139.6985);
        const osaka = spot('nVeVH2ssSYI', 34.7855, 135.4438);
        const sapporo = spot('SiNdj5dEq_8', 43.0599, 141.34751);
        const naha = spot('3e_uPkJCTNo', 26.17673, 127.64061);
        const dead = spot('deadTokyo', 35.68, 139.76, false);
        const noId = { lat: 35.68, lng: 139.76, is_live: true, video_id: '' };
        const all = [station, shibuya, osaka, sapporo, naha];
        const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
        ok(inJapan(35.68, 139.76) && inJapan(43.06, 141.35) && inJapan(26.21, 127.68), 'Honshu Hokkaido Okinawa');
        ok(!inJapan(32.78, -96.8) && !inJapan(null, 139.76) && !inJapan(35.68, undefined) && !inJapan(Number.NaN, 139.76), 'reject US/null/NaN');
        ok(eq(nearestTwo([], 35.68, 139.76), []) && eq(ids([dead, noId], 35.68, 139.76), []), 'empty when nothing live');
        ok(eq(ids([station, dead], 35.68, 139.76), ['ZN4gh5IOowM']), 'one live');
        ok(eq(ids(all, 35.68, 139.76), ['ZN4gh5IOowM', 'EaRgJQ--2eE']), 'Tokyo station then Shibuya');
        ok(ids(all, 34.69, 135.5)[0] === 'nVeVH2ssSYI', 'Osaka airport');
        ok(ids(all, 43.06, 141.35)[0] === 'SiNdj5dEq_8', 'Sapporo');
        ok(ids(all, 26.21, 127.68)[0] === '3e_uPkJCTNo', 'Naha');
        ok(eq(ids([dead, noId, shibuya, osaka], 35.68, 139.76), ['EaRgJQ--2eE', 'nVeVH2ssSYI']), 'skip dead and no id');
        ok(eq(ids(all, 32.78, -96.8), ids(all, ...TOKYO)) && eq(ids(all, null, null), ids(all, ...TOKYO)), 'outside Japan → Tokyo');
        const line = Array.from({ length: 12 }, (_, i) => spot(`c${i}`, 35.68, 139.76 + i * 0.01));
        ok(eq(nearest(line, 35.68, 139.76, 10).map(s => s.video_id), ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']), 'nearest 10 cap');
        ok(eq(nearest(all, 35.68, 139.76).map(s => s.video_id), ids(all, 35.68, 139.76)), 'default n=2');
        ok(eq(nearest(all, 35.68, 139.76, 1).map(s => s.video_id), ['ZN4gh5IOowM']), 'n=1');
        ok(eq(nearest([shibuya, osaka], 35.68, 139.76, 10).map(s => s.video_id), ['EaRgJQ--2eE', 'nVeVH2ssSYI']), 'fewer than n');
        const far = Array.from({ length: 10 }, (_, i) => spot(`f${i}`, 35.68, 140 + i * 0.1));
        const evicted = nearest([...far, spot('close', 35.68, 139.76)], 35.68, 139.76, 10).map(s => s.video_id);
        ok(evicted[0] === 'close' && evicted.length === 10 && !evicted.includes('f9'), 'evict farther');
        ok(inJapan(24, 122) && inJapan(46, 146) && !inJapan(23.99, 139.76) && !inJapan(35.68, 121.99), 'bbox edges');
        ok(eq(ids(all, 23.99, 139.76), ids(all, ...TOKYO)), 'just outside → Tokyo');
        ok(eq(nearest([{ video_id: 'fake', lat: 35.68, lng: 139.76, is_live: 1 }, shibuya], 35.68, 139.76, 2).map(s => s.video_id), ['EaRgJQ--2eE']), 'is_live boolean');
        const ten = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9'];
        ok(eq(pairAt(ten, 0), ['c0', 'c1']) && eq(pairAt(ten, 4), ['c8', 'c9']), 'pairAt pages');
        ok(eq(pairAt(['a', 'b', 'c'], 1), ['c']), 'pairAt leftover');
        ok(nextPage(10, 0) === 1 && nextPage(10, 4) === 0, 'nextPage wrap');
        ok(nextPage(0, 0) === 0 && nextPage(2, 0) === 0, 'nextPage stay');
        ok(nextPage(3, 0) === 1 && nextPage(3, 1) === 0, 'nextPage odd');
        const east = spot('east', 35.68, 139.9);
        const north = spot('north', 35.8, 139.76);
        ok(eq(ids([east, north], 35.68, 139.76), ['east', 'north']), 'equirectangular');
        return;
    }
    if (scenario === 'chrome') {
        ok(!window.Telegram?.WebApp?.initData, 'no native initData');
        const tg = createChrome();
        tg.ready();
        tg.expand();
        tg.disableVerticalSwipes();
        tg.setHeaderColor('secondary_bg_color');
        tg.setBackgroundColor('bg_color');
        const main = $('#MainButton');
        const secondary = $('#SecondaryButton');
        const back = $('#BackButton');
        tg.MainButton.setText('Continue');
        ok(main.textContent === 'Continue', 'MainButton.setText');
        tg.MainButton.show();
        ok(!main.hidden && !$('#chrome').hidden, 'MainButton.show');
        let clicks = 0;
        tg.MainButton.onClick(() => { clicks++; });
        main.click();
        ok(clicks === 1, 'MainButton.onClick');
        tg.MainButton.hide();
        ok(main.hidden && $('#chrome').hidden, 'MainButton.hide');
        tg.SecondaryButton.setText('Cancel');
        ok(secondary.textContent === 'Cancel', 'SecondaryButton.setText');
        tg.SecondaryButton.show();
        ok(!secondary.hidden && !$('#chrome').hidden, 'SecondaryButton.show');
        tg.SecondaryButton.hide();
        ok(secondary.hidden, 'SecondaryButton.hide');
        tg.BackButton.show();
        ok(!back.hidden && !$('#chrome').hidden, 'BackButton.show');
        let backClicks = 0;
        tg.BackButton.onClick(() => { backClicks++; });
        back.click();
        ok(backClicks === 1, 'BackButton.onClick');
        tg.BackButton.hide();
        ok(back.hidden, 'BackButton.hide');
        tg.HapticFeedback.impactOccurred('heavy');
        tg.HapticFeedback.selectionChanged();
    }
};

ready().then(run).then(() => {
    const el = document.getElementById('checks');
    el.textContent = log.join('\n') || 'FAIL unknown scenario';
    if (log.some(l => l.startsWith('FAIL'))) document.title = 'FAIL';
});
