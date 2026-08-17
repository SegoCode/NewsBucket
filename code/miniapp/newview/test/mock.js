const scenario = new URLSearchParams(location.search).get('s') || 'feed';

const SCENES = {
    loading: { t: 'finance', l: 'en' },
    empty: { t: 'finance', l: 'en' },
    feed: { t: 'finance', l: 'en' },
    'feed-es': { t: 'finance', l: 'es' },
    'feed-click': { t: 'finance', l: 'en' },
    lang: { t: 'finance', l: 'jp' },
    'status-ok': { t: 'status', l: 'en' },
    'status-running': { t: 'status', l: 'en' },
    'status-fail': { t: 'status', l: 'en' },
    'status-empty': { t: 'status', l: 'en' },
    diag: { t: 'status', l: 'en' },
    'diag-gps': { t: 'status', l: 'en' },
    'diag-ip-gps': { t: 'status', l: 'en' },
    'diag-none': { t: 'status', l: 'en' },
    'diag-denied': { t: 'status', l: 'en' },
    'diag-ask': { t: 'status', l: 'en' },
    'diag-raw': { t: 'status', l: 'en' },
    quakes: { t: 'japan', l: 'en' },
    'quake-mag': { t: 'japan', l: 'en' },
    'quake-age': { t: 'japan', l: 'en' },
    'quake-blink': { t: 'japan', l: 'en' },
    'quake-drop': { t: 'japan', l: 'en' },
    'quake-combo': { t: 'japan', l: 'en' },
    weather: { t: 'japan', l: 'en' },
    'weather-l2': { t: 'japan', l: 'en' },
    'weather-jp': { t: 'japan', l: 'jp' },
    'weather-ip': { t: 'japan', l: 'en' },
    'geo-wins': { t: 'japan', l: 'en' },
    'weather-osaka': { t: 'japan', l: 'en' },
    'japan-jp': { t: 'japan', l: 'jp' },
    'japan-us': { t: 'japan', l: 'en' },
    'japan-es': { t: 'japan', l: 'es' },
    mix: { t: 'japan', l: 'en' },
    live: { t: 'japan', l: 'en' },
    'live-open': { t: 'japan', l: 'en' },
    'live-en': { t: 'japan', l: 'en' },
    'live-back': { t: 'japan', l: 'en' },
    'live-topic': { t: 'japan', l: 'en' },
    'feed-down': { t: 'finance', l: 'en' },
    'feed-count': { t: 'tech', l: 'en' },
    'status-mixed': { t: 'status', l: 'en' },
};

const scene = SCENES[scenario] || SCENES.feed;
try {
    localStorage.setItem('nb', JSON.stringify(scene));
    localStorage.removeItem('nb-actions');
} catch {}

const LOCATION = {
    weather: { ip: 'tokyo', gps: 'tokyo' },
    'weather-ip': { ip: 'tokyo' },
    'geo-wins': { ip: 'osaka', gps: 'tokyo', gpsDelay: 20 },
    mix: { ip: 'tokyo', gps: 'tokyo' },
    'japan-jp': { ip: 'tokyo', gps: 'tokyo' },
    'japan-es': { ip: 'tokyo', gps: 'tokyo' },
    'weather-osaka': { ip: 'osaka', gps: 'osaka' },
    'weather-l2': { ip: 'tokyo', gps: 'tokyo' },
    'weather-jp': { ip: 'tokyo', gps: 'tokyo' },
    diag: { ip: 'tokyo' },
    'diag-gps': { ip: 'us', ipDelay: 80, gps: 'tokyo', gpsDelay: 20 },
    'diag-ip-gps': { ip: 'tokyo', gps: 'osaka', gpsDelay: 80 },
    'diag-none': { ipFail: true },
    'diag-denied': { ip: 'tokyo', denied: true },
    'diag-ask': { ip: 'tokyo', gps: 'tokyo', denyOnce: true },
    'status-ok': { ip: 'tokyo' },
    'status-running': { ip: 'tokyo' },
    'status-fail': { ip: 'tokyo' },
    'status-empty': { ip: 'tokyo' },
    'japan-us': { ip: 'us' },
    quakes: { ip: 'us' },
}[scenario] || { ip: 'us' };

const CLUSTERS = {
    en: [
        { title: 'Four outlets on rates', source: ['a.com', 'b.com', 'c.com', 'd.com'], count: 4 },
        { title: 'Three outlets on chips', source: ['a.com', 'b.com', 'c.com'], count: 3 },
        { title: 'Two outlets on apps', source: ['a.com', 'b.com'], count: 2 },
    ],
    es: [
        { title: 'Cuatro medios sobre tipos', source: ['a.com', 'b.com', 'c.com', 'd.com'], count: 4 },
        { title: 'Tres medios sobre chips', source: ['a.com', 'b.com', 'c.com'], count: 3 },
        { title: 'Dos medios sobre apps', source: ['a.com', 'b.com'], count: 2 },
    ],
    jp: [
        { title: '金利を4社が報道', source: ['a.com', 'b.com', 'c.com', 'd.com'], count: 4 },
        { title: '半導体を3社が報道', source: ['a.com', 'b.com', 'c.com'], count: 3 },
        { title: 'アプリを2社が報道', source: ['a.com', 'b.com'], count: 2 },
    ],
};

const JAPAN_NEWS = {
    en: [{ title: 'Diet passes bill', source: ['nhk.or.jp', 'asahi.com'], count: 2 }],
    es: [{ title: 'La Dieta aprueba el proyecto', source: ['nhk.or.jp', 'asahi.com'], count: 2 }],
    jp: [{ title: '国会が法案を可決', source: ['nhk.or.jp', 'asahi.com'], count: 2 }],
};

const iso = ago => new Date(Date.now() - ago).toISOString();
const q = (eid, mag, ago, en) => ({
    eid, mag, cod: '+35.0+139.0/', at: iso(ago), ctt: eid, anm: en, en_anm: en,
});
const quakes = () => {
    if (scenario === 'quake-mag') return [q('1', '4.5', 60e3, 'Floor'), q('2', '4.4', 60e3, 'Below')];
    if (scenario === 'quake-age') return [q('1', '5.0', 47 * 3600e3, 'Inside'), q('2', '5.0', 2 * 864e5, 'Outside')];
    if (scenario === 'quake-blink') return [q('1', '5.0', 3600e3, 'Fresh'), q('2', '5.0', 2 * 3600e3, 'Stale')];
    if (scenario === 'quake-combo') return [
        q('1', '6.0', 3600e3, 'Hot'),
        q('2', '4.5', 47 * 3600e3, 'Edge'),
        q('3', '4.4', 60e3, 'Weak'),
        q('4', '5.0', 2 * 864e5, 'Old'),
    ];
    if (scenario === 'quake-drop') return [
        q('1', '5.0', 60e3, 'Kept'),
        { eid: '2', mag: '', cod: '+35.0+139.0/', at: iso(60e3), ctt: '2', anm: '無', en_anm: 'No mag' },
        { eid: '3', mag: '5.0', at: iso(60e3), ctt: '3', anm: '無', en_anm: 'No cod' },
    ];
    return [
        { eid: '1', mag: '6.1', cod: '+35.6+139.7/', at: iso(25 * 60e3), ctt: '1', anm: '東京湾', en_anm: 'old dup' },
        { eid: '1', mag: '6.2', cod: '+35.6+139.7/', at: iso(20 * 60e3), ctt: '2', anm: '東京湾', en_anm: 'Tokyo Bay' },
        { eid: '2', mag: '5.4', cod: '+34.4+135.2/', at: iso(5 * 3600e3), ctt: '3', anm: '大阪湾', en_anm: 'Osaka Bay' },
        { eid: '3', mag: '4.4', cod: '+35.0+139.0/', at: iso(10 * 60e3), ctt: '4', anm: '千葉', en_anm: 'Chiba' },
        { eid: '4', mag: '5.5', cod: '+38.0+142.0/', at: iso(2 * 864e5), ctt: '5', anm: '三陸沖', en_anm: 'Sanriku' },
    ];
};

const RUN = {
    id: 1,
    status: scenario === 'status-running' ? 'in_progress' : 'completed',
    updated_at: '2026-08-17T10:00:00Z',
    html_url: 'https://github.com/SegoCode/NewsBucket/actions/runs/1',
};

const START = Date.parse('2026-08-17T10:00:00.000Z');
const job = (name, state, ms = 90e3) => {
    const running = state === 'running';
    const fail = state === 'fail';
    return {
        name,
        status: running ? 'in_progress' : 'completed',
        conclusion: running ? null : fail ? 'failure' : 'success',
        started_at: new Date(START).toISOString(),
        completed_at: running ? null : new Date(START + ms).toISOString(),
        html_url: 'https://github.com/SegoCode/NewsBucket/actions/runs/1/job/1',
        steps: fail
            ? [
                { name: 'Set up job', conclusion: 'failure' },
                { name: 'Compile translations', conclusion: 'failure' },
            ]
            : [],
    };
};

const NAMES = ['Cluster tech', 'Cluster finance', 'Cluster gaming', 'Cluster japan', 'Translate clusters'];
const TIMES = [45e3, 180e3, 90e3, 45e3, 180e3];
const jobs = () => {
    if (scenario === 'status-running') return { jobs: [] };
    if (scenario === 'status-fail') {
        return { jobs: NAMES.map(n => job(n, n === 'Translate clusters' ? 'fail' : 'ok')) };
    }
    if (scenario === 'status-mixed') {
        return { jobs: [
            job(NAMES[0], 'ok'),
            job(NAMES[1], 'running'),
            job(NAMES[2], 'ok'),
            job(NAMES[3], 'fail'),
            job(NAMES[4], 'running'),
        ] };
    }
    return { jobs: NAMES.map((n, i) => job(n, 'ok', TIMES[i])) };
};

const AREA = {
    offices: {
        130000: { children: ['130010'] },
        270000: { children: ['270010'] },
    },
    class10s: {
        130010: { children: ['130011'] },
        270010: { children: ['270011'] },
    },
    class20s: {
        1310100: { parent: '130011' },
        2710000: { parent: '270011' },
    },
};

const SETTING = {
    lines: [[], ['rain', 'flood', 'storm']],
    panels: {
        rain: {
            url: ['warn'],
            enName: { 5: 'Heavy rain [Level 3] alert' },
            name: { 5: '大雨 [レベル3] アラート' },
        },
        flood: {
            url: ['warn'],
            enName: { 1: 'Flood alert' },
            name: { 1: '洪水アラート' },
        },
        storm: {
            url: ['warn'],
            enName: { 8: 'Storm [Level 5] alert' },
            name: { 8: '暴風 [レベル5] アラート' },
        },
    },
    urls: { warn: 'forecast/warn.json' },
};

const WARN = {
    rain: { x: { 130010: '5' } },
    flood: { x: { 130010: '1' } },
    storm: { x: { 130010: '8', 270010: '8' } },
};

const IP = {
    tokyo: { ip: '203.0.113.10', location: { city: 'Tokyo', country: 'Japan', latitude: 35.68, longitude: 139.76 } },
    osaka: { ip: '203.0.113.20', location: { city: 'Osaka', country: 'Japan', latitude: 34.69, longitude: 135.5 } },
    us: { ip: '198.51.100.8', location: { city: 'Dallas', country: 'US', latitude: 32.78, longitude: -96.8 } },
};

const GEO = {
    tokyo: { countryCode: 'JP', principalSubdivisionCode: 'JP-13', principalSubdivision: 'Tokyo' },
    osaka: { countryCode: 'JP', principalSubdivisionCode: 'JP-27', principalSubdivision: 'Osaka' },
    us: { countryCode: 'US', principalSubdivisionCode: 'US-TX', principalSubdivision: 'Texas' },
};

const COORDS = {
    tokyo: { latitude: 35.68, longitude: 139.76 },
    osaka: { latitude: 34.69, longitude: 135.5 },
};

let geoAsks = 0;
Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
        getCurrentPosition(ok, err) {
            geoAsks++;
            const wait = LOCATION.gpsDelay ?? 20;
            if (LOCATION.denied || (LOCATION.denyOnce && geoAsks === 1)) {
                setTimeout(() => err?.({ code: 1 }), wait);
                return;
            }
            const coords = COORDS[LOCATION.gps];
            setTimeout(() => coords ? ok({ coords }) : err?.(), wait);
        },
    },
});

const json = (data, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    }));

const text = (body, status = 200) =>
    Promise.resolve(new Response(body, { status }));

const withQuakes = scenario.startsWith('quake') || scenario.startsWith('japan') || scenario === 'mix';
const noJapanNews = scenario.startsWith('quake') || scenario.startsWith('weather') || scenario === 'geo-wins'
    || scenario.startsWith('live');

window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (scenario === 'loading') return new Promise(() => {});

    const cluster = url.match(/rss_(\w+)_clusters_(\w+)\.json/);
    if (cluster) {
        if (scenario === 'empty') return json([]);
        const lang = cluster[2];
        if (cluster[1] === 'japan') {
            if (noJapanNews) return json([]);
            return json(JAPAN_NEWS[lang] || JAPAN_NEWS.en);
        }
        if (scenario === 'feed-down') return text('', 404);
        if (scenario === 'feed-count') {
            return json([
                { title: 'Four sources', source: ['a.com', 'b.com', 'c.com', 'd.com'] },
                { title: 'Two sources', source: ['a.com', 'b.com'] },
            ]);
        }
        const items = CLUSTERS[lang] || CLUSTERS.en;
        if (scenario === 'feed-click') {
            return json(items.map((item, i) => i ? item : { ...item, url: 'https://example.com/rates' }));
        }
        return json(items);
    }

    if (url.includes('/workflows/update-news.yml/runs')) {
        if (scenario === 'status-empty') return json({ workflow_runs: [] });
        return json({ workflow_runs: [RUN] });
    }
    if (/\/actions\/runs\/\d+\/jobs/.test(url)) return json(jobs());

    if (url === 'https://api.github.com' || url === 'https://api.github.com/') {
        return scenario.startsWith('diag')
            ? text('', 403)
            : json({});
    }
    if (url.includes('cloudflare.com/cdn-cgi/trace')) return text('fl=1');
    if (url.includes('prompts/cluster.md')) {
        return scenario === 'diag-raw' ? text('', 429) : text('# cluster', 200);
    }
    if (url.includes('ip.guide')) {
        if (LOCATION.ipFail) return Promise.reject(new Error('down'));
        const response = json(IP[LOCATION.ip] || IP.us);
        return LOCATION.ipDelay
            ? new Promise(resolve => setTimeout(() => response.then(resolve), LOCATION.ipDelay))
            : response;
    }
    if (url.includes('reverse-geocode-client')) {
        const lat = Number(new URL(url).searchParams.get('latitude'));
        const place = lat > 35 && lat < 36 ? 'tokyo' : lat > 34 && lat < 35 ? 'osaka' : 'us';
        const response = json(GEO[place]);
        return scenario === 'geo-wins' && place === 'osaka'
            ? new Promise(resolve => setTimeout(() => response.then(resolve), 120))
            : response;
    }

    if (url.includes('quake/data/list.json')) return json(withQuakes ? quakes() : []);
    if (url.includes('common/const/area.json')) {
        if (scenario.startsWith('diag')) return Promise.reject(new Error('down'));
        return json(AREA);
    }
    if (url.includes('panel/const/setting.json')) {
        if (scenario === 'weather-l2') {
            return json({
                lines: [[], ['rain']],
                panels: {
                    rain: {
                        url: ['warn'],
                        enName: { 3: 'Wind [Level 2] alert' },
                        name: { 3: '風 [レベル2] アラート' },
                    },
                },
                urls: { warn: 'forecast/warn.json' },
            });
        }
        return json(SETTING);
    }
    if (url.includes('www.jma.go.jp/bosai/')) {
        if (scenario === 'weather-l2') return json({ rain: { x: { 130010: '3' } } });
        return json(WARN);
    }

    return Promise.reject(new Error('unmocked ' + url));
};
