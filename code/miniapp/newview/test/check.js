const scenario = new URLSearchParams(location.search).get('s') || 'feed';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));

const wait = async (fn, ms = 3000) => {
    const t = Date.now();
    while (Date.now() - t < ms) {
        if (fn()) return true;
        await sleep(20);
    }
    return false;
};

const log = [];
const ok = (cond, msg) => { log.push(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); };

const articles = () => $$('#feed article');
const titles = () => articles().map(a => $('h2', a).textContent.trim());
const classes = () => articles().map(a => a.className.trim());
const sources = () => articles().map(a => $('.sources', a).textContent);

const COUNT = {
    empty: 0,
    feed: 3,
    'feed-es': 3,
    'feed-click': 3,
    lang: 3,
    'status-ok': 5,
    'status-running': 5,
    'status-fail': 5,
    'status-empty': 0,
    diag: 5,
    'diag-gps': 5,
    'diag-ip-gps': 5,
    'diag-none': 5,
    quakes: 2,
    weather: 3,
    'weather-ip': 3,
    'geo-wins': 3,
    'weather-osaka': 1,
    'japan-jp': 6,
    'japan-us': 3,
    mix: 6,
    live: 0,
    'live-open': 0,
    'live-en': 0,
};

const ready = async () => {
    if (scenario === 'loading') {
        await sleep(80);
        return;
    }
    await wait(() => !$('#status') || $('#status').textContent !== 'Loading…');
    const n = COUNT[scenario];
    if (n) await wait(() => articles().length >= n);
    if (scenario.startsWith('live')) await wait(() => !$('#chrome').hidden);
    if (scenario.startsWith('diag')) {
        await wait(() => $('#diag-gh').textContent !== '—');
        if (scenario === 'diag') await wait(() => $('#diag-place').textContent.includes('Tokyo'));
        if (scenario === 'diag-gps') {
            await wait(() => $('#diag-place').textContent.includes('Browser') && $('#diag-ip').textContent === '198.51.100.8');
        }
        if (scenario === 'diag-ip-gps') {
            await wait(() => $('#diag-place').textContent.includes('Browser') && $('#diag-place').textContent.includes('34.690'));
        }
    }
    if (scenario === 'live-open' || scenario === 'live-en') {
        $('#MainButton').click();
        await wait(() => !$('#live').hidden);
    }
    if (scenario === 'live-en') {
        $('#SecondaryButton').click();
        await wait(() => $('#SecondaryButton').textContent.includes('JAPANESE'));
    }
};

const run = () => {
    if (scenario === 'loading') {
        ok($('#status')?.textContent === 'Loading…', 'Loading…');
        ok(!articles().length, 'no articles');
        return;
    }
    if (scenario === 'empty' || scenario === 'status-empty') {
        ok($('#status')?.textContent === 'No news', 'No news');
        if (scenario === 'status-empty') ok(!$('#diag').hidden, 'diag on');
        return;
    }
    if (scenario === 'feed') {
        ok(articles().length === 3, '3 articles');
        ok(classes().join() === 'high,medium,low', 'tiers high medium low');
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
    if (scenario === 'status-ok') {
        ok(titles().join() === 'Tech digest,Finance digest,Gaming digest,Japan digest,Translated editions', '5 jobs');
        ok(classes().every(c => c === 'ok'), 'all ok');
        ok(sources()[0].includes('45s'), '45s');
        ok(sources()[1].includes('3m') && !sources()[1].includes('s'), '3m');
        ok(sources()[2].includes('1m 30s'), '1m 30s');
        ok(articles().every(a => a.getAttribute('onclick')), 'job urls');
        return;
    }
    if (scenario === 'status-running') {
        ok(articles().length === 5, '5 jobs');
        ok(classes().every(c => c === 'running'), 'all running');
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
    if (scenario.startsWith('diag')) {
        ok(!$('#diag').hidden, 'diag visible');
        ok($('#diag-gh').textContent.includes('rate limit'), 'gh 403');
        ok($('#diag-cf').textContent.includes('ok'), 'cf ok');
        ok($('#diag-jma').textContent.includes('down'), 'jma down');
        if (scenario === 'diag') {
            ok($('#diag-ip').textContent === '203.0.113.10', 'ip');
            ok($('#diag-place').textContent.includes('IP') && $('#diag-place').textContent.includes('Tokyo'), 'place IP');
        }
        if (scenario === 'diag-gps') {
            ok($('#diag-place').textContent.includes('35.680') && $('#diag-place').textContent.includes('Browser'), 'gps');
            ok($('#diag-ip').textContent === '198.51.100.8', 'late ip kept');
            ok(!$('#diag-place').textContent.includes('Dallas'), 'late ip did not replace gps');
        }
        if (scenario === 'diag-ip-gps') {
            ok($('#diag-place').textContent.includes('34.690') && $('#diag-place').textContent.includes('Browser'), 'late gps wins');
            ok($('#diag-ip').textContent === '203.0.113.10', 'early ip kept');
            ok(!$('#diag-place').textContent.includes('Tokyo'), 'gps replaced ip location');
        }
        if (scenario === 'diag-none') {
            ok($('#diag-place').textContent === '—', 'no place');
            ok($('#diag-ip').textContent === '—', 'no ip');
        }
        return;
    }
    if (scenario === 'quakes') {
        ok(classes()[0] === 'quake-high quake-recent', 'recent <1h');
        ok(classes()[1] === 'quake-high', 'older <24h');
        ok(titles()[0].startsWith('M6.2') && titles()[0].includes('Tokyo Bay'), 'M6.2');
        ok(titles()[1].startsWith('M5.4'), 'M5.4');
        ok(titles().every(t => !t.includes('Weather alert')), 'no weather');
        ok(articles()[0].getAttribute('onclick')?.includes('geo:'), 'geo url');
        return;
    }
    if (scenario === 'weather' || scenario === 'weather-ip') {
        ok(titles()[0].includes('Heavy rain') && titles()[0].includes('Level 3'), 'rain L3');
        ok(titles()[1] === 'Weather alert: Flood', 'flood L1');
        ok(titles()[2].includes('Storm') && titles()[2].includes('Level 5'), 'storm L5');
        ok(sources()[0].includes('Tokyo'), 'Tokyo');
        ok(!titles().some(t => t.startsWith('M')), 'no quake');
        if (scenario === 'weather-ip') ok(articles().length === 3, 'ip-only weather');
        return;
    }
    if (scenario === 'weather-osaka') {
        ok(articles().length === 1, '1 alert');
        ok(titles()[0].includes('Storm') && titles()[0].includes('Level 5'), 'storm');
        ok(sources()[0].includes('Osaka'), 'Osaka');
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
    if (scenario === 'mix') {
        ok(articles().length === 6, '6 items');
        ok(titles()[0].startsWith('M6.2') && titles()[1].startsWith('M5.4'), 'quakes first');
        ok(titles()[2].includes('Heavy rain') && titles()[4].includes('Storm'), 'weather types');
        ok(titles()[5] === 'Diet passes bill', 'news last');
        return;
    }
    if (scenario === 'live') {
        ok(!$('#chrome').hidden, 'chrome on');
        ok($('#live').hidden, 'live off');
        ok(!$('#MainButton').hidden && $('#MainButton').textContent === 'LIVE NEWS', 'LIVE NEWS');
        ok($('#BackButton').hidden && $('#SecondaryButton').hidden, 'back/swap off');
        return;
    }
    if (scenario === 'live-open') {
        ok(!$('#live').hidden, 'overlay');
        ok($('#MainButton').hidden, 'main off');
        ok(!$('#BackButton').hidden, 'back on');
        ok($('#SecondaryButton').textContent === 'SWITCH TO ENGLISH', 'swap en');
        return;
    }
    if (scenario === 'live-en') {
        ok(!$('#live').hidden, 'overlay');
        ok($('#SecondaryButton').textContent === 'SWITCH TO JAPANESE', 'swap jp');
    }
};

ready().then(run).then(() => {
    const el = document.getElementById('checks');
    el.textContent = log.join('\n') || 'FAIL unknown scenario';
    if (log.some(l => l.startsWith('FAIL'))) document.title = 'FAIL';
});
