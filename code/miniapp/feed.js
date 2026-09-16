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

const good = hit => Array.isArray(hit?.items) && hit.items.length ? hit.items : null;

const commitsPending = new Map();
const commitsOf = (topic, lang) => {
    const key = `${topic}:${lang}`;
    if (!commitsPending.has(key)) {
        commitsPending.set(key, (async () => {
            try {
                const res = await fetch(
                    `${COMMITS}?path=${encodeURIComponent(clusterFile(topic, lang))}&per_page=2`,
                );
                if (!res.ok) throw new Error(res.status);
                const list = await res.json();
                const head = Array.isArray(list) ? list[0]?.sha : '';
                if (!head) return null;
                return { head, yday: list[1]?.sha || null };
            } catch {
                return null;
            }
        })());
    }
    return commitsPending.get(key);
};

const pullSha = async (topic, lang, sha, pointerKey) => {
    const store = clusterStore();
    const cached = good(store[sha]) || (store[pointerKey]?.sha === sha && good(store[pointerKey]));
    if (cached) return cached;
    const inflightKey = `sha:${sha}`;
    if (inflight.has(inflightKey)) return inflight.get(inflightKey);
    const pending = (async () => {
        try {
            const items = await pullClusters(topic, lang, sha);
            if (!items.length) return [];
            try {
                const next = clusterStore();
                next[sha] = { items };
                if (pointerKey) next[pointerKey] = { at: Date.now(), items, sha };
                localStorage.setItem(CACHE_KEY, JSON.stringify(next));
            } catch {}
            return items;
        } catch {
            return pointerKey ? good(clusterStore()[pointerKey]) || [] : [];
        }
    })().finally(() => inflight.delete(inflightKey));
    inflight.set(inflightKey, pending);
    return pending;
};

const pullMain = async (topic, lang) => {
    const key = `${topic}:${lang}`;
    const hit = clusterStore()[key];
    const cached = good(hit);
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

export const fetchClusters = async (topic, lang, ref) => {
    if (ref && ref !== 'main') return pullSha(topic, lang, ref);
    const shas = await commitsOf(topic, lang);
    if (shas?.head) return pullSha(topic, lang, shas.head, `${topic}:${lang}`);
    return pullMain(topic, lang);
};

export const fetchYesterday = async (topic, lang) => {
    const yday = (await commitsOf(topic, lang))?.yday;
    if (!yday) return [];
    return fetchClusters(topic, lang, yday);
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
