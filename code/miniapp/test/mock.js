const scenario = new URLSearchParams(location.search).get('s') || 'feed';

const SCENES = {
    loading: { t: 'finance', l: 'en' },
    empty: { t: 'finance', l: 'en' },
    fresh: { l: 'en' },
    feed: { t: 'finance', l: 'en' },
    'feed-es': { t: 'finance', l: 'es' },
    'feed-click': { t: 'finance', l: 'en' },
    lang: { t: 'finance', l: 'jp' },
    'lang-es': {},
    'lang-ja': {},
    'lang-en': {},
    'lang-ua': {},
    'lang-ua-ja': {},
    'lang-uscore': {},
    'lang-nav': {},
    'lang-default': {},
    'lang-bad-nb': {},
    'lang-keep': { l: 'jp' },
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
    'diag-github': { t: 'status', l: 'en' },
    'diag-403': { t: 'status', l: 'en' },
    'diag-coords': { t: 'status', l: 'en' },
    'diag-telegram': { t: 'status', l: 'en' },
    'diag-timeout': { t: 'status', l: 'en' },
    'diag-nogeo': { t: 'status', l: 'en' },
    quakes: { t: 'japan', l: 'en' },
    'quake-mag': { t: 'japan', l: 'en' },
    'quake-age': { t: 'japan', l: 'en' },
    'quake-blink': { t: 'japan', l: 'en' },
    'quake-drop': { t: 'japan', l: 'en' },
    'quake-combo': { t: 'japan', l: 'en' },
    'quake-cod': { t: 'japan', l: 'en' },
    'quake-bad-cod': { t: 'japan', l: 'en' },
    weather: { t: 'japan', l: 'en' },
    'weather-l2': { t: 'japan', l: 'en' },
    'weather-l10': { t: 'japan', l: 'en' },
    'weather-jp': { t: 'japan', l: 'jp' },
    'weather-ip': { t: 'japan', l: 'en' },
    'geo-wins': { t: 'japan', l: 'en' },
    'geo-refresh': { t: 'japan', l: 'en' },
    'weather-osaka': { t: 'japan', l: 'en' },
    'japan-jp': { t: 'japan', l: 'jp' },
    'japan-us': { t: 'japan', l: 'en' },
    'japan-es': { t: 'japan', l: 'es' },
    mix: { t: 'japan', l: 'en' },
    live: { t: 'japan', l: 'en' },
    'live-open': { t: 'japan', l: 'en' },
    'live-yt': { t: 'japan', l: 'en' },
    'live-en': { t: 'japan', l: 'en' },
    'live-back': { t: 'japan', l: 'en' },
    'live-topic': { t: 'japan', l: 'en' },
    'live-cameras': { t: 'japan', l: 'en' },
    'live-next': { t: 'japan', l: 'en' },
    'live-cams-news': { t: 'japan', l: 'en' },
    'live-reopen': { t: 'japan', l: 'en' },
    'cams-cache': { t: 'japan', l: 'en' },
    cameras: { t: 'finance', l: 'en' },
    chrome: { t: 'finance', l: 'en' },
    'feed-down': { t: 'finance', l: 'en' },
    'feed-nosource': { t: 'finance', l: 'en' },
    'feed-count': { t: 'tech', l: 'en' },
    'topic-switch': { t: 'finance', l: 'en' },
    'stale-load': { t: 'finance', l: 'en' },
    'lang-switch': { t: 'finance', l: 'en' },
    'end-mark': { t: 'finance', l: 'en' },
    yesterday: { t: 'finance', l: 'en' },
    'yesterday-stale': { t: 'finance', l: 'en' },
    'yesterday-sha': { t: 'finance', l: 'en' },
    'yesterday-lang': { t: 'finance', l: 'en' },
    'yesterday-topic': { t: 'finance', l: 'en' },
    'yesterday-empty': { t: 'finance', l: 'en' },
    'yesterday-fail': { t: 'finance', l: 'en' },
    'yesterday-one': { t: 'finance', l: 'en' },
    'yesterday-jp': { t: 'finance', l: 'jp' },
    'yesterday-retry': { t: 'finance', l: 'en' },
    'quake-west': { t: 'japan', l: 'en' },
    'quake-down': { t: 'japan', l: 'en' },
    'weather-hokkaido': { t: 'japan', l: 'en' },
    'weather-down': { t: 'japan', l: 'en' },
    'status-mixed': { t: 'status', l: 'en' },
    'status-leave': { t: 'status', l: 'en' },
    'status-cache': { t: 'status', l: 'en' },
    'status-post': { t: 'status', l: 'en' },
    'watch-stop': { t: 'japan', l: 'en' },
    'weather-c20': { t: 'japan', l: 'en' },
    'weather-html': { t: 'japan', l: 'en' },
    'weather-city': { t: 'status', l: 'en' },
    'weather-tg': { t: 'japan', l: 'en' },
    'weather-level': { t: 'japan', l: 'en' },
    'weather-stale': { t: 'japan', l: 'en' },
    'haptic-tg': { t: 'finance', l: 'en' },
    'weather-nolm': { t: 'japan', l: 'en' },
    'weather-no-c20': { t: 'japan', l: 'en' },
    'weather-panel': { t: 'japan', l: 'en' },
    'diag-gps-city': { t: 'status', l: 'en' },
};

const scene = SCENES[scenario] || SCENES.feed;
const store = fn => { try { fn(localStorage); } catch {} };
store(ls => {
    ls.setItem('nb', JSON.stringify(scene));
    ls.removeItem('nb-actions');
    ls.removeItem('nb-cams');
    if (scenario === 'lang-bad-nb') ls.setItem('nb', '{');
    if (scenario === 'status-cache') {
        ls.setItem('nb-actions', JSON.stringify({
            at: Date.now(),
            run: { id: 9, status: 'completed', updated_at: '2026-08-17T10:00:00Z', html_url: 'https://example.com/cached-run' },
            jobs: ['Cluster tech', 'Cluster finance', 'Cluster gaming', 'Cluster japan', 'Translate clusters'].map(name => ({
                name,
                status: 'completed',
                conclusion: 'success',
                started_at: '2026-08-17T10:00:00Z',
                completed_at: '2026-08-17T10:00:45Z',
                html_url: 'https://example.com/cached-job',
                steps: [],
            })),
        }));
    }
    if (scenario === 'cams-cache') {
        ls.setItem('nb-cams', JSON.stringify({
            at: Date.now(),
            spots: [
                { lat: 35.68, lng: 139.76, video_id: 'cached1', is_live: true },
                { lat: 35.69, lng: 139.77, video_id: 'cached2', is_live: true },
            ],
        }));
    }
});

const NAV_LANG = {
    'lang-es': { languages: ['es-ES'] },
    'lang-ja': { languages: ['ja-JP'] },
    'lang-en': { languages: ['en-US'] },
    'lang-ua': { languages: [], language: '', ua: 'Mozilla/5.0 (Linux; Android 14; es-ES)' },
    'lang-ua-ja': { languages: [], language: '', ua: 'Mozilla/5.0 (Linux; Android 14; ja-JP)' },
    'lang-uscore': { languages: ['es_MX'] },
    'lang-nav': { languages: [], language: 'ja-JP' },
    'lang-default': { languages: [], language: '' },
    'lang-bad-nb': { languages: ['en-US'] },
    'lang-keep': { languages: ['es-MX'] },
}[scenario];
if (NAV_LANG) {
    Object.defineProperty(navigator, 'languages', { configurable: true, get: () => NAV_LANG.languages || [] });
    Object.defineProperty(navigator, 'language', {
        configurable: true,
        get: () => NAV_LANG.language ?? NAV_LANG.languages?.[0] ?? '',
    });
    if (NAV_LANG.ua) {
        Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => NAV_LANG.ua });
    }
}

const LOCATION = {
    weather: { ip: 'tokyo', gps: 'tokyo' },
    'weather-ip': { ip: 'tokyo' },
    'geo-wins': { ip: 'osaka', gps: 'tokyo', gpsDelay: 20 },
    'geo-refresh': { ip: 'tokyo', gps: ['tokyo', 'nagoya'], gpsDelays: [20, 300] },
    mix: { ip: 'tokyo', gps: 'tokyo' },
    'japan-jp': { ip: 'tokyo', gps: 'tokyo' },
    'japan-es': { ip: 'tokyo', gps: 'tokyo' },
    'weather-osaka': { ip: 'osaka', gps: 'osaka' },
    'weather-l2': { ip: 'tokyo', gps: 'tokyo' },
    'weather-l10': { ip: 'tokyo', gps: 'tokyo' },
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
    'quake-cod': { ip: 'us' },
    'quake-bad-cod': { ip: 'us' },
    'quake-west': { ip: 'us' },
    'quake-down': { ip: 'us' },
    'weather-hokkaido': { ip: 'hokkaido', gps: 'hokkaido' },
    'weather-down': { ip: 'tokyo', gps: 'tokyo' },
    'diag-github': { ip: 'tokyo' },
    'diag-403': { ip: 'tokyo' },
    'diag-coords': { ipFail: true, gps: 'tokyo' },
    'diag-telegram': { ip: 'us' },
    'diag-timeout': { ip: 'tokyo', timeout: true },
    'diag-nogeo': { ip: 'tokyo' },
    'weather-c20': { ip: 'tokyo', gps: 'tokyo' },
    'weather-html': { ip: 'tokyo', gps: 'tokyo' },
    'weather-city': { ipFail: true, gps: 'tokyo' },
    'weather-tg': { ip: 'tokyo' },
    'weather-level': { ip: 'tokyo', gps: 'tokyo' },
    'weather-stale': { ip: 'tokyo', gps: ['tokyo', 'nagoya'], gpsDelays: [20, 300] },
    'weather-nolm': { ip: 'us', gps: 'tokyo' },
    'weather-no-c20': { ip: 'tokyo', gps: 'tokyo' },
    'weather-panel': { ip: 'tokyo', gps: 'tokyo' },
    'diag-gps-city': { ip: 'tokyo', ipDelay: 80, gps: 'tokyo', gpsDelay: 20 },
    'watch-stop': { ip: 'tokyo', gps: 'tokyo', gpsDelay: 1500 },
    'status-leave': { ip: 'tokyo' },
    'status-cache': { ip: 'tokyo' },
    'status-post': { ip: 'tokyo' },
}[scenario] || { ip: 'us' };

const FOUR = ['a.com', 'b.com', 'c.com', 'd.com'];
const THREE = ['a.com', 'b.com', 'c.com'];
const TWO = ['a.com', 'b.com'];
const CLUSTERS = {
    en: [
        { title: 'Four outlets on rates', source: FOUR, count: 4 },
        { title: 'Three outlets on chips', source: THREE, count: 3 },
        { title: 'Two outlets on apps', source: TWO, count: 2 },
    ],
    es: [
        { title: 'Cuatro medios sobre tipos', source: FOUR, count: 4 },
        { title: 'Tres medios sobre chips', source: THREE, count: 3 },
        { title: 'Dos medios sobre apps', source: TWO, count: 2 },
    ],
    jp: [
        { title: '金利を4社が報道', source: FOUR, count: 4 },
        { title: '半導体を3社が報道', source: THREE, count: 3 },
        { title: 'アプリを2社が報道', source: TWO, count: 2 },
    ],
};

const TECH = [
    { title: 'Foundry wins contract', source: FOUR, count: 4 },
    { title: 'Kernel patch lands', source: THREE, count: 3 },
    { title: 'Browser ships wasm', source: TWO, count: 2 },
];

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
    if (scenario === 'quake-west') return [
        { eid: '1', mag: '7.1', cod: '+05.0-076.3-120000/', at: iso(60e3), ctt: '1', anm: '中米', en_anm: 'Central America' },
    ];
    if (scenario === 'quake-cod') return [
        { eid: 'ibaraki', mag: '5.8', cod: '+36.0+140.1/', at: iso(40 * 60e3), ctt: '1', anm: '茨城県', en_anm: 'old decimal' },
        { eid: 'ibaraki', mag: '5.9', cod: '+3559.9+14005.7-70000/', at: iso(20 * 60e3), ctt: '2', anm: '茨城県', en_anm: 'Ibaraki' },
        { eid: 'urakawa', mag: '6.0', cod: '+41.8+142.9-50000/', at: iso(60 * 60e3), ctt: '3', anm: '浦河沖', en_anm: 'Urakawa' },
    ];
    if (scenario === 'quake-bad-cod') return [
        { eid: 'bad', mag: '6.0', cod: 'garbage', at: iso(60e3), ctt: '1', anm: '壊', en_anm: 'Broken' },
        { eid: 'one', mag: '5.1', cod: '+35.0', at: iso(60e3), ctt: '2', anm: '片', en_anm: 'Half' },
        q('3', '5.0', 60e3, 'Kept'),
    ];
    if (scenario === 'quake-drop') return [
        q('1', '5.0', 60e3, 'Kept'),
        { eid: '2', mag: '', cod: '+35.0+139.0/', at: iso(60e3), ctt: '2', anm: '無', en_anm: 'No mag' },
        { eid: '3', mag: '5.0', at: iso(60e3), ctt: '3', anm: '無', en_anm: 'No cod' },
        { eid: '5', mag: '5.2', cod: '+35.0+139.0/', at: iso(60e3), anm: '無ctt', en_anm: 'No ctt' },
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
        conclusion: { running: null, fail: 'failure', ok: 'success' }[state],
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
    if (scenario === 'status-post') {
        const fail = job(NAMES[4], 'fail');
        fail.steps = [
            { name: 'Complete job', conclusion: 'failure' },
            { name: 'Post Checkout', conclusion: 'failure' },
            { name: 'Compile translations', conclusion: 'failure' },
        ];
        return { jobs: NAMES.slice(0, 4).map(n => job(n, 'ok')).concat(fail) };
    }
    if (scenario === 'status-mixed') {
        const recent = name => {
            const row = job(name, 'running');
            row.started_at = new Date(Date.now() - 90e3).toISOString();
            return row;
        };
        return { jobs: [
            job(NAMES[0], 'ok'),
            recent(NAMES[1]),
            job(NAMES[2], 'ok'),
            job(NAMES[3], 'fail'),
            recent(NAMES[4]),
        ] };
    }
    return { jobs: NAMES.map((n, i) => job(n, 'ok', TIMES[i])) };
};

const AREA = {
    offices: {
        '011000': { children: ['011000'] },
        '016000': { children: ['016010'] },
        '014030': { children: ['014030'] },
        130000: { children: ['130010'] },
        270000: { children: ['270010'] },
    },
    class10s: {
        '011000': { children: ['011001'] },
        '016010': { children: ['016011'] },
        '014030': { children: ['014031'] },
        130010: { children: ['130011'] },
        270010: { children: ['270011'] },
    },
    class20s: {
        '0110100': { parent: '011001' },
        '0161000': { parent: '016011' },
        '0141000': { parent: '014031' },
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
    rain: { x: { 130010: '5', '016010': '5' } },
    flood: { x: { 130010: '1' } },
    storm: { x: { 130010: '8', 270010: '8', '014030': '8' } },
};

const TESTNET = {
    tokyo: '203.0.113.10',
    osaka: '203.0.113.20',
    us: '198.51.100.8',
    hokkaido: '203.0.113.30',
};
const IP = {
    tokyo: { ip: TESTNET.tokyo, location: { city: 'Tokyo', country: 'Japan', latitude: 35.68, longitude: 139.76 } },
    osaka: { ip: TESTNET.osaka, location: { city: 'Osaka', country: 'Japan', latitude: 34.69, longitude: 135.5 } },
    us: { ip: TESTNET.us, location: { city: 'Dallas', country: 'US', latitude: 32.78, longitude: -96.8 } },
    hokkaido: { ip: TESTNET.hokkaido, location: { city: 'Sapporo', country: 'Japan', latitude: 43.06, longitude: 141.35 } },
};

const GEO = {
    tokyo: { countryCode: 'JP', principalSubdivisionCode: 'JP-13', principalSubdivision: 'Tokyo' },
    osaka: { countryCode: 'JP', principalSubdivisionCode: 'JP-27', principalSubdivision: 'Osaka' },
    nagoya: { countryCode: 'JP', principalSubdivisionCode: 'JP-23', principalSubdivision: 'Nagoya' },
    us: { countryCode: 'US', principalSubdivisionCode: 'US-TX', principalSubdivision: 'Texas' },
    hokkaido: { countryCode: 'JP', principalSubdivisionCode: 'JP-01', principalSubdivision: 'Hokkaido' },
};

const COORDS = {
    tokyo: { latitude: 35.68, longitude: 139.76 },
    osaka: { latitude: 34.69, longitude: 135.5 },
    nagoya: { latitude: 35.18, longitude: 136.91 },
    hokkaido: { latitude: 43.06, longitude: 141.35 },
};

const GEO_MS = 20;
let geoAsks = 0;
let watchId = 0;
const watches = new Map();
Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
        getCurrentPosition(ok, err) {
            geoAsks++;
            const wait = LOCATION.gpsDelay ?? GEO_MS;
            if (LOCATION.timeout) {
                setTimeout(() => err?.({ code: 3 }), wait);
                return;
            }
            if (LOCATION.denied || (LOCATION.denyOnce && geoAsks === 1)) {
                setTimeout(() => err?.({ code: 1 }), wait);
                return;
            }
            const coords = COORDS[LOCATION.gps];
            setTimeout(() => coords ? ok({ coords }) : err?.(), wait);
        },
        watchPosition(ok, err) {
            geoAsks++;
            const id = ++watchId;
            const places = (Array.isArray(LOCATION.gps) ? LOCATION.gps : [LOCATION.gps]).filter(Boolean);
            const timers = places.map((place, i) => setTimeout(
                () => ok({ coords: COORDS[place] }),
                LOCATION.gpsDelays?.[i] ?? LOCATION.gpsDelay ?? GEO_MS,
            ));
            if (!places.length || LOCATION.denied) {
                timers.push(setTimeout(() => err?.({ code: LOCATION.denied ? 1 : 2 }), LOCATION.gpsDelay ?? GEO_MS));
            }
            watches.set(id, timers);
            return id;
        },
        clearWatch(id) {
            watches.get(id)?.forEach(clearTimeout);
            watches.delete(id);
        },
    },
});
if (scenario === 'diag-nogeo') {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
}

if (scenario === 'diag-telegram' || scenario === 'weather-tg' || scenario === 'haptic-tg' || scenario === 'weather-nolm') {
    const haptic = { impact: 0, selection: 0 };
    globalThis.Telegram = {
        WebApp: {
            initData: '1',
            haptic,
            HapticFeedback: {
                impactOccurred() { haptic.impact++; },
                selectionChanged() { haptic.selection++; },
            },
            ...(scenario === 'weather-nolm' ? {} : {
                LocationManager: {
                    isAccessGranted: scenario === 'diag-telegram',
                    init(cb) { queueMicrotask(cb); },
                    getLocation(cb) {
                        cb(scenario === 'diag-telegram' ? { latitude: 35.68, longitude: 139.76 } : null);
                    },
                },
            }),
            ready() {},
            expand() {},
            disableVerticalSwipes() {},
            setHeaderColor() {},
            setBackgroundColor() {},
        },
    };
}

globalThis.YT = {
    Player: class {
        constructor(id, opts) {
            this.el = document.getElementById(id);
            this.videoId = opts.videoId;
            this.volume = 100;
            this.muted = !!opts.playerVars?.mute;
            this.playing = false;
            this.loads = 0;
            this._paint();
            queueMicrotask(() => opts.events?.onReady?.({ target: this }));
        }
        _paint() {
            if (!this.el) return;
            this.el.dataset.vid = this.videoId || '';
            this.el.dataset.vol = String(this.volume);
            this.el.dataset.muted = this.muted ? '1' : '0';
            this.el.dataset.playing = this.playing ? '1' : '0';
            this.el.dataset.loads = String(this.loads);
        }
        getVideoData() { return { video_id: this.videoId }; }
        loadVideoById(id) { this.videoId = id; this.loads += 1; this.playing = true; this._paint(); }
        setVolume(v) { this.volume = v; this._paint(); }
        mute() { this.muted = true; this._paint(); }
        unMute() { this.muted = false; this._paint(); }
        playVideo() { this.playing = true; this._paint(); }
        stopVideo() { this.playing = false; this._paint(); }
    },
};

const json = (data, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    }));

const text = (body, status = 200) =>
    Promise.resolve(new Response(body, { status }));

const hang = () => new Promise(() => {});
const later = (ms, value) => new Promise(resolve => setTimeout(() => {
    if (value && typeof value.then === 'function') value.then(resolve);
    else resolve(value);
}, ms));

const SHA = { head: 'cafebabe', yday: 'deadbeef', es: 'beefcafe', tech: 'feedface' };
const pair = (a, b) => json([{ sha: a }, { sha: b }]);

let commitTries = 0;
const withQuakes = scenario.startsWith('quake') || scenario.startsWith('japan') || scenario === 'mix';
const noJapanNews = ((scenario.startsWith('quake') || scenario.startsWith('weather')) && !scenario.endsWith('-down'))
    || scenario === 'geo-wins'
    || scenario === 'geo-refresh'
    || scenario.startsWith('live')
    || scenario === 'cams-cache'
    || scenario === 'watch-stop';

const commits = url => {
    const finance = url.includes('rss_finance_clusters');
    const tech = url.includes('rss_tech_clusters');
    if (scenario === 'yesterday-fail' && finance) return text('', 403);
    if (scenario === 'yesterday-retry' && finance) {
        commitTries++;
        if (commitTries === 1) return text('', 403);
        return pair(SHA.head, SHA.es);
    }
    if (scenario === 'yesterday-one' && finance) return json([{ sha: SHA.head }]);
    if (scenario === 'yesterday-lang' && finance) {
        return pair(SHA.head, url.includes('clusters_es.json') ? SHA.es : SHA.yday);
    }
    if (scenario === 'yesterday-topic') {
        if (tech) return pair(SHA.head, SHA.tech);
        if (finance) return pair(SHA.head, SHA.yday);
    }
    if (finance && ['yesterday', 'yesterday-stale', 'yesterday-sha', 'yesterday-empty', 'yesterday-jp'].includes(scenario)) {
        const body = pair(SHA.head, SHA.yday);
        return scenario === 'yesterday-stale' ? later(250, body) : body;
    }
    return json([]);
};

const clusters = url => {
    const cluster = url.match(/rss_(\w+)_clusters_(\w+)\.json/);
    if (scenario === 'empty' || (scenario === 'yesterday-empty' && url.includes('/main/'))) return json([]);
    if (url.includes(`/${SHA.yday}/`)) {
        return json([{ title: 'Yesterday rates', source: ['old.com', 'older.com'], count: 2 }]);
    }
    if (url.includes(`/${SHA.head}/`)) {
        return json([{ title: 'HEAD rates', source: ['now.com', 'now2.com'], count: 2 }]);
    }
    if (url.includes(`/${SHA.es}/`)) {
        return json([{ title: 'Tipos de ayer', source: ['old.com', 'older.com'], count: 2 }]);
    }
    if (url.includes(`/${SHA.tech}/`)) {
        return json([{ title: 'Yesterday chips', source: ['old.com', 'older.com'], count: 2 }]);
    }
    const lang = cluster[2];
    if (cluster[1] === 'japan') {
        if (noJapanNews) return json([]);
        return json(JAPAN_NEWS[lang] || JAPAN_NEWS.en);
    }
    if (scenario === 'feed-down') return text('', 404);
    if ((scenario === 'topic-switch' || scenario === 'stale-load' || scenario === 'yesterday-stale' || scenario === 'yesterday-topic') && cluster[1] === 'tech') {
        return json(TECH);
    }
    if (scenario === 'stale-load' && cluster[1] === 'finance') return later(250, json(CLUSTERS.en));
    if (scenario === 'feed-count') {
        return json([
            { title: 'Four sources', source: FOUR },
            { title: 'Two sources', source: TWO },
        ]);
    }
    if (scenario === 'feed-nosource') {
        return json([
            { title: 'Orphan headline', count: 2 },
            { title: 'Two sources', source: TWO },
        ]);
    }
    const items = CLUSTERS[lang] || CLUSTERS.en;
    if (scenario === 'feed-click') {
        return json(items.map((item, i) => i ? item : { ...item, url: 'https://example.com/rates' }));
    }
    return json(items);
};

globalThis.fetch = input => {
    const url = typeof input === 'string' ? input : input.url;
    if (scenario === 'loading') return hang();
    if (url.includes('/commits?')) return commits(url);
    if (/rss_\w+_clusters_\w+\.json/.test(url)) return clusters(url);

    if (url.includes('/workflows/update-news.yml/runs')) {
        if (scenario === 'status-empty' || scenario === 'status-cache') return json({ workflow_runs: [] });
        return json({ workflow_runs: [RUN] });
    }
    if (/\/actions\/runs\/\d+\/jobs/.test(url)) return json(jobs());

    if (url.includes('cloudflare.com/cdn-cgi/trace')) return text('fl=1');
    if (url.includes('livecameras.json')) {
        if (scenario === 'cams-cache') return text('', 500);
        return json({ spots: [
            { lat: 35.68, lng: 139.76, video_id: 'near1', is_live: true },
            { lat: 35.69, lng: 139.77, video_id: 'near2', is_live: true },
            { lat: 43.06, lng: 141.35, video_id: 'far', is_live: true },
            { lat: 35.68, lng: 139.76, video_id: 'dead', is_live: false },
        ] });
    }
    if (url.includes('prompts/cluster.md')) {
        if (scenario === 'diag-github') return text('', 429);
        if (scenario === 'diag-403') return text('', 403);
        return text('# cluster', 200);
    }
    if (url.includes('ip.guide')) {
        if (LOCATION.ipFail) return Promise.reject(new Error('down'));
        const response = json(IP[LOCATION.ip] || IP.us);
        return LOCATION.ipDelay ? later(LOCATION.ipDelay, response) : response;
    }
    if (url.includes('reverse-geocode-client')) {
        const lat = Number(new URL(url).searchParams.get('latitude'));
        const lon = Number(new URL(url).searchParams.get('longitude'));
        let place = 'us';
        if (lat > 42) place = 'hokkaido';
        else if (lon > 136 && lon < 137.5) place = 'nagoya';
        else if (lat > 35 && lat < 36) place = 'tokyo';
        else if (lat > 34 && lat < 35) place = 'osaka';
        if (scenario === 'weather-stale' && place === 'nagoya') return Promise.reject(new Error('down'));
        if (scenario === 'diag-coords') return json({});
        if (scenario === 'diag-gps-city') return Promise.reject(new Error('down'));
        if (scenario === 'weather-city') {
            return json({
                countryCode: 'JP',
                countryName: 'Japan',
                principalSubdivisionCode: 'JP-13',
                principalSubdivision: 'Tokyo',
                locality: 'Shibuya',
            });
        }
        const response = json(GEO[place]);
        return scenario === 'geo-wins' && place === 'osaka' ? later(120, response) : response;
    }

    if (url.includes('quake/data/list.json')) {
        if (scenario === 'quake-down') return text('', 500);
        return json(withQuakes ? quakes() : []);
    }
    if (url.includes('common/const/area.json')) {
        if (scenario.startsWith('diag') || scenario === 'weather-down') return Promise.reject(new Error('down'));
        if (scenario === 'weather-no-c20') return json({ offices: AREA.offices, class10s: AREA.class10s });
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
        if (scenario === 'weather-html') {
            return json({
                lines: [[], ['rain', 'flood']],
                panels: {
                    rain: {
                        url: ['warn'],
                        enName: { 5: '<b>Ｈｅａｖｙ</b> rain [Level 3] alert' },
                        name: { 5: '大雨 [レベル3] アラート' },
                    },
                    flood: {
                        url: ['warn'],
                        enName: { 1: 'Flood alert' },
                        name: { 1: '' },
                    },
                },
                urls: { warn: 'forecast/warn.json' },
            });
        }
        if (scenario === 'weather-level') {
            return json({
                lines: [[], ['rain']],
                panels: {
                    rain: {
                        url: ['warn'],
                        enName: { 3: 'Rain [Level 2] alert', 8: 'Rain [Level 5] alert' },
                        name: { 3: '雨 [レベル2] アラート', 8: '雨 [レベル5] アラート' },
                    },
                },
                urls: { warn: 'forecast/warn.json' },
            });
        }
        if (scenario === 'weather-l10') {
            return json({
                lines: [[], ['storm']],
                panels: {
                    storm: {
                        url: ['warn'],
                        enName: {
                            8: 'Storm [Level 5] alert',
                            10: 'Special warning [Level 10] alert',
                        },
                        name: {
                            8: '暴風 [レベル5] アラート',
                            10: '特別警報 [レベル10] アラート',
                        },
                    },
                },
                urls: { warn: 'forecast/warn.json' },
            });
        }
        if (scenario === 'weather-panel') {
            return json({
                lines: [[], ['rain', 'storm']],
                panels: {
                    rain: {
                        url: ['warn'],
                        enName: { 5: 'Heavy rain [Level 3] alert' },
                        name: { 5: '大雨 [レベル3] アラート' },
                    },
                    storm: {
                        url: ['storm'],
                        enName: { 8: 'Storm [Level 5] alert' },
                        name: { 8: '暴風 [レベル5] アラート' },
                    },
                },
                urls: { warn: 'forecast/warn.json', storm: 'forecast/storm.json' },
            });
        }
        return json(SETTING);
    }
    if (url.includes('forecast/storm.json')) return Promise.reject(new Error('down'));
    if (url.includes('www.jma.go.jp/bosai/')) {
        if (scenario === 'weather-l2') return json({ rain: { x: { 130010: '3' } } });
        if (scenario === 'weather-panel') return json({ rain: { x: { 130010: '5' } } });
        if (scenario === 'weather-no-c20') return json({ rain: { x: { 130010: '5' } } });
        if (scenario === 'weather-c20') return json({ rain: { x: { 1310100: '5' } } });
        if (scenario === 'weather-html') return json({ rain: { x: { 130010: '5' } }, flood: { x: { 130010: '1' } } });
        if (scenario === 'weather-level') return json({ rain: { x: { 130010: '3', 130011: '8' } } });
        if (scenario === 'weather-l10') return json({ storm: { x: { 130010: '8', 130011: '10' } } });
        return json(WARN);
    }

    return Promise.reject(new Error('unmocked ' + url));
};
