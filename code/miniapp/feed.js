const REPO = 'https://raw.githubusercontent.com/SegoCode/NewsBucket';
const COMMITS = 'https://api.github.com/repos/SegoCode/NewsBucket/commits';
const clusterFile = (topic, lang) =>
    `code/rss_output_cluster/rss_${topic}_clusters_${lang}.json`;
const clusterUrl = (topic, lang, ref = 'main') =>
    `${REPO}/${ref}/${clusterFile(topic, lang)}`;

export const fetchClusters = async (topic, lang, ref) => {
    const res = await fetch(clusterUrl(topic, lang, ref));
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
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
