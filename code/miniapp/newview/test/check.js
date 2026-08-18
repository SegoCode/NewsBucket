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
    fresh: 1,
    feed: 3,
    'feed-es': 3,
    'feed-click': 3,
    lang: 3,
    'lang-es': 1,
    'lang-ja': 1,
    'lang-en': 1,
    'lang-ua': 1,
    'lang-keep': 1,
    'feed-count': 2,
    'status-ok': 5,
    'status-running': 5,
    'status-fail': 5,
    'status-empty': 0,
    'status-mixed': 5,
    diag: 5,
    'diag-gps': 5,
    'diag-ip-gps': 5,
    'diag-none': 5,
    'diag-denied': 5,
    'diag-ask': 5,
    'diag-raw': 5,
    quakes: 2,
    'quake-mag': 1,
    'quake-age': 1,
    'quake-blink': 2,
    'quake-drop': 1,
    'quake-combo': 2,
    weather: 3,
    'weather-l2': 1,
    'weather-jp': 3,
    'weather-ip': 3,
    'geo-wins': 3,
    'geo-refresh': 3,
    'weather-osaka': 1,
    'japan-jp': 6,
    'japan-us': 3,
    'japan-es': 6,
    mix: 6,
    live: 0,
    'live-open': 0,
    'live-en': 0,
    'live-back': 0,
    'live-topic': 0,
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
        if (scenario === 'diag-raw') await wait(() => $('#diag-raw').textContent.includes('rate limit'));
    }
    if (scenario === 'live-open' || scenario === 'live-en' || scenario === 'live-back') {
        $('#MainButton').click();
        await wait(() => !$('#live').hidden);
    }
    if (scenario === 'live-en') {
        $('#SecondaryButton').click();
        await wait(() => $('#SecondaryButton').textContent.includes('JAPANESE'));
    }
    if (scenario === 'live-back') {
        $('#BackButton').click();
        await wait(() => $('#live').hidden);
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
        return;
    }
    if (scenario === 'status-running') {
        ok(articles().length === 5, '5 jobs');
        ok(classes().every(c => c === 'running'), 'all running');
        return;
    }
    if (scenario === 'feed-count') {
        ok(articles().length === 2, '2 articles');
        ok(classes().join() === 'high,low', 'count from sources');
        ok(titles().join() === 'Four sources,Two sources', 'titles');
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
        return;
    }
    if (scenario.startsWith('diag')) {
        ok(!$('#diag').hidden, 'diag visible');
        ok($('#diag-gh').textContent.includes('rate limit'), 'gh 403');
        ok($('#diag-cf').textContent.includes('ok'), 'cf ok');
        ok($('#diag-jma').textContent.includes('down'), 'jma down');
        if (scenario === 'diag-raw') ok($('#diag-raw').textContent.includes('rate limit'), 'raw 429');
        else ok($('#diag-raw').textContent.includes('ok'), 'raw 200');
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
        return;
    }
    if (scenario === 'quakes') {
        ok(classes()[0] === 'quake-high quake-recent', 'recent <2h');
        ok(classes()[1] === 'quake-high', 'older <24h');
        ok(titles()[0].startsWith('M6.2') && titles()[0].includes('Tokyo Bay'), 'M6.2');
        ok(titles()[1].startsWith('M5.4'), 'M5.4');
        ok(titles().every(t => !t.includes('Weather alert')), 'no weather');
        ok(articles()[0].getAttribute('onclick')?.includes('geo:'), 'geo url');
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
        ok(articles().length === 1, 'only complete');
        ok(titles()[0].includes('Kept'), 'kept');
        ok(!titles().some(t => t.includes('No mag') || t.includes('No cod')), 'incomplete dropped');
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
        return;
    }
    if (scenario === 'weather-l2') {
        ok(articles().length === 1, '1 alert');
        ok(titles()[0].includes('Wind') && titles()[0].includes('Level 2'), 'L2 title');
        ok(!classes()[0].includes('quake-recent'), 'L2 still');
        return;
    }
    if (scenario === 'weather-jp') {
        ok(titles()[0].includes('大雨') && titles()[0].includes('レベル3'), '雨');
        ok(titles()[1] === '気象警報: 洪水', '洪水');
        ok(titles()[2].includes('暴風') && titles()[2].includes('レベル5'), '暴風');
        ok(classes()[0].includes('quake-recent') && !classes()[1].includes('quake-recent') && classes()[2].includes('quake-recent'), 'jp blink');
        return;
    }
    if (scenario === 'weather-osaka') {
        ok(articles().length === 1, '1 alert');
        ok(titles()[0].includes('Storm') && titles()[0].includes('Level 5'), 'storm');
        ok(sources()[0].includes('Osaka'), 'Osaka');
        ok(classes()[0].includes('quake-recent'), 'L5 blinks');
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
        const live = $('#live').getBoundingClientRect();
        const chrome = $('#chrome').getBoundingClientRect();
        const pad = parseFloat(getComputedStyle($('#live')).paddingBottom);
        ok(Math.abs(live.bottom - pad - chrome.top) < 1, 'live meets chrome');
        ok(getComputedStyle(document.body).overflow === 'hidden', 'scroll locked');
        ok(getComputedStyle($('.live-player')).backgroundColor === 'rgb(0, 0, 0)', 'player opaque');
        return;
    }
    if (scenario === 'live-en') {
        ok(!$('#live').hidden, 'overlay');
        ok($('#SecondaryButton').textContent === 'SWITCH TO JAPANESE', 'swap jp');
        return;
    }
    if (scenario === 'live-back') {
        ok($('#live').hidden, 'closed');
        ok(!$('#MainButton').hidden && $('#MainButton').textContent === 'LIVE NEWS', 'LIVE NEWS');
        ok($('#BackButton').hidden, 'back off');
        return;
    }
    if (scenario === 'live-topic') {
        ok($('#topic').value === 'finance', 'left japan');
        ok($('#chrome').hidden, 'chrome off');
        ok(titles()[0] === 'Four outlets on rates', 'finance feed');
        ok($('#live').hidden, 'live off');
    }
};

ready().then(run).then(() => {
    const el = document.getElementById('checks');
    el.textContent = log.join('\n') || 'FAIL unknown scenario';
    if (log.some(l => l.startsWith('FAIL'))) document.title = 'FAIL';
});
