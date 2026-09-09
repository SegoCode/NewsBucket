const HOUR = 3600e3;
const WINDOW = 48 * HOUR;
const BLINK = 12 * HOUR;
const PAGE = 'https://radar.cloudflare.com/cloud-observatory';
const PREFIX = { en: 'Outage', es: 'Incidencia', jp: '障害' };

const age = t => {
    const n = Date.parse(t);
    return Number.isFinite(n) ? Date.now() - n : Infinity;
};

const alert = (lang, name, detail, start) => ({
    title: `${PREFIX[lang] || PREFIX.en}: ${name}: ${detail}`,
    source: [name],
    cls: 'quake-high' + (age(start) < BLINK ? ' quake-recent' : ''),
    url: PAGE,
});

const statuspage = async (origin, name) => {
    const res = await fetch(`${origin}/api/v2/incidents/unresolved.json`);
    if (!res.ok) throw new Error(res.status);
    const incidents = (await res.json()).incidents;
    if (!Array.isArray(incidents)) return [];
    const hit = incidents.find(i =>
        i?.name && i.status !== 'resolved' && !i.resolved_at
        && age(i.updated_at || i.started_at || i.created_at) < WINDOW);
    if (!hit) return [];
    return [{ name, detail: hit.name, start: hit.started_at || hit.created_at || hit.updated_at }];
};

const aws = async () => {
    const res = await fetch('https://status.aws.amazon.com/rss/all.rss');
    if (!res.ok) throw new Error(res.status);
    const doc = new DOMParser().parseFromString(await res.text(), 'text/xml');
    const hit = [...doc.querySelectorAll('item')].find(it =>
        age(it.querySelector('pubDate')?.textContent) < WINDOW);
    const title = hit?.querySelector('title')?.textContent?.trim();
    const start = hit?.querySelector('pubDate')?.textContent;
    return title ? [{ name: 'AWS', detail: title, start }] : [];
};

const gcp = async () => {
    const res = await fetch('https://status.cloud.google.com/incidents.json');
    if (!res.ok) throw new Error(res.status);
    const list = await res.json();
    if (!Array.isArray(list)) return [];
    const hit = list.find(i => {
        if (!i?.external_desc) return false;
        if (!i.end) return age(i.begin) < WINDOW || age(i.created) < WINDOW;
        return age(i.end) < WINDOW || age(i.begin) < WINDOW;
    });
    return hit
        ? [{ name: 'Google Cloud', detail: hit.external_desc.trim(), start: hit.begin || hit.created }]
        : [];
};

const CACHE_KEY = 'nb-outages';
const CACHE_MS = 30 * 60 * 1000;
let rowsPromise;
let rowsAt = 0;

const loadRows = () => {
    if (rowsPromise && Date.now() - rowsAt < CACHE_MS) return rowsPromise;
    rowsAt = Date.now();
    rowsPromise = (async () => {
        let hit;
        try {
            hit = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        } catch {
            hit = null;
        }
        const cached = Array.isArray(hit?.rows) && hit.rows.length ? hit.rows : null;
        if (cached && Date.now() - hit.at < CACHE_MS) return cached;
        const settled = await Promise.allSettled([
            statuspage('https://www.githubstatus.com', 'GitHub'),
            statuspage('https://www.cloudflarestatus.com', 'Cloudflare'),
            aws(),
            gcp(),
        ]);
        const ok = settled.filter(s => s.status === 'fulfilled');
        if (!ok.length) {
            if (cached) return cached;
            throw new Error('down');
        }
        const rows = ok.flatMap(s => s.value);
        if (rows.length) {
            try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rows })); } catch {}
            return rows;
        }
        try { localStorage.removeItem(CACHE_KEY); } catch {}
        return [];
    })().catch(() => {
        rowsPromise = null;
        rowsAt = 0;
        return [];
    });
    return rowsPromise;
};

export const fetchCloudOutages = async (lang = 'en') =>
    (await loadRows()).map(r => alert(lang, r.name, r.detail, r.start));
