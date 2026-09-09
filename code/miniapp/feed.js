const REPO = 'https://raw.githubusercontent.com/SegoCode/NewsBucket';
const COMMITS = 'https://api.github.com/repos/SegoCode/NewsBucket/commits';
const CACHE_KEY = 'nb-clusters';
const CACHE_MS = 3 * 60 * 60 * 1000;
const clusterFile = (topic, lang) =>
    `code/rss_output_cluster/rss_${topic}_clusters_${lang}.json`;
const clusterUrl = (topic, lang, ref = 'main') =>
    `${REPO}/${ref}/${clusterFile(topic, lang)}`;

const clusterStore = () => {
    try {
        const store = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        return store && typeof store === 'object' && !Array.isArray(store) ? store : {};
    } catch {
        return {};
    }
};

const inflight = new Map();

const pullClusters = async (topic, lang, ref) => {
    const res = await fetch(clusterUrl(topic, lang, ref));
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
};

export const fetchClusters = async (topic, lang, ref) => {
    if (ref && ref !== 'main') {
        try {
            return await pullClusters(topic, lang, ref);
        } catch {
            return [];
        }
    }
    const key = `${topic}:${lang}`;
    const hit = clusterStore()[key];
    const cached = Array.isArray(hit?.items) && hit.items.length ? hit.items : null;
    if (cached && Date.now() - hit.at < CACHE_MS) return cached;
    if (inflight.has(key)) return inflight.get(key);
    const pending = (async () => {
        try {
            const items = await pullClusters(topic, lang);
            if (items.length) {
                try {
                    const store = clusterStore();
                    store[key] = { at: Date.now(), items };
                    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
                } catch {}
                return items;
            }
            try {
                const store = clusterStore();
                delete store[key];
                localStorage.setItem(CACHE_KEY, JSON.stringify(store));
            } catch {}
            return [];
        } catch {
            return cached || [];
        }
    })().finally(() => inflight.delete(key));
    inflight.set(key, pending);
    return pending;
};

const yday = new Map();

export const fetchYesterday = (topic, lang) => {
    const key = `${topic}:${lang}`;
    if (!yday.has(key)) {
        yday.set(key, (async () => {
            try {
                const res = await fetch(
                    `${COMMITS}?path=${encodeURIComponent(clusterFile(topic, lang))}&per_page=2`,
                );
                if (!res.ok) throw new Error(res.status);
                const sha = (await res.json())[1]?.sha;
                if (!sha) return [];
                return fetchClusters(topic, lang, sha);
            } catch {
                yday.delete(key);
                return [];
            }
        })());
    }
    return yday.get(key);
};

export const articlesHtml = data => {
    if (!Array.isArray(data) || !data.length) return '';
    const tier = c => {
        if (String(c).startsWith('quake')) return 0;
        if (c === 'high') return 1;
        if (c === 'medium' || c === 'running') return 2;
        return 3;
    };
    const rank = count => {
        if (count >= 4) return 'high';
        if (count >= 3) return 'medium';
        return 'low';
    };
    const items = data.map(item => {
        const source = Array.isArray(item.source) ? item.source : [];
        const count = item.count || source.length;
        return { ...item, source, cls: item.cls || rank(count) };
    });
    items.sort((a, b) => tier(a.cls) - tier(b.cls));
    return items.map(item => {
        const open = item.url ? ` onclick="window.open('${item.url}', '_blank')"` : '';
        return `
        <article class="${item.cls}"${open}>
            <h2>${item.title}</h2>
            <div class="sources">${item.source.join(' · ')}</div>
        </article>
    `;
    }).join('');
};

export const render = (data, feed) => {
    if (!Array.isArray(data) || !data.length) { feed.innerHTML = '<div id="status">No news</div>'; return; }
    feed.innerHTML = articlesHtml(data);
};
