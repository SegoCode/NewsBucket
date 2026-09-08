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

const statuspage = async (origin, name, lang) => {
    const res = await fetch(`${origin}/api/v2/incidents/unresolved.json`);
    if (!res.ok) return [];
    const incidents = (await res.json()).incidents;
    if (!Array.isArray(incidents)) return [];
    const row = incidents.find(i =>
        i?.name && i.status !== 'resolved' && !i.resolved_at
        && age(i.updated_at || i.started_at || i.created_at) < WINDOW);
    if (!row) return [];
    return [alert(lang, name, row.name, row.started_at || row.created_at || row.updated_at)];
};

const aws = async lang => {
    const res = await fetch('https://status.aws.amazon.com/rss/all.rss');
    if (!res.ok) return [];
    const doc = new DOMParser().parseFromString(await res.text(), 'text/xml');
    const hit = [...doc.querySelectorAll('item')].find(it =>
        age(it.querySelector('pubDate')?.textContent) < WINDOW);
    const title = hit?.querySelector('title')?.textContent?.trim();
    const start = hit?.querySelector('pubDate')?.textContent;
    return title ? [alert(lang, 'AWS', title, start)] : [];
};

const gcp = async lang => {
    const res = await fetch('https://status.cloud.google.com/incidents.json');
    if (!res.ok) return [];
    const list = await res.json();
    if (!Array.isArray(list)) return [];
    const row = list.find(i => {
        if (!i?.external_desc) return false;
        if (!i.end) return age(i.begin) < WINDOW || age(i.created) < WINDOW;
        return age(i.end) < WINDOW || age(i.begin) < WINDOW;
    });
    return row
        ? [alert(lang, 'Google Cloud', row.external_desc.trim(), row.begin || row.created)]
        : [];
};

export const fetchCloudOutages = async (lang = 'en') => {
    const settled = await Promise.allSettled([
        statuspage('https://www.githubstatus.com', 'GitHub', lang),
        statuspage('https://www.cloudflarestatus.com', 'Cloudflare', lang),
        aws(lang),
        gcp(lang),
    ]);
    return settled.flatMap(s => s.status === 'fulfilled' ? s.value : []);
};
