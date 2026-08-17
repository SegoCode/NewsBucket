const BASE = 'https://raw.githubusercontent.com/SegoCode/NewsBucket/main/code/rss_output_cluster';

export const fetchClusters = async (topic, lang) => {
    const res = await fetch(`${BASE}/rss_${topic}_clusters_${lang}.json`);
    if (!res.ok) return [];
    return res.json();
};

export const render = (data, feed) => {
    if (!data.length) { feed.innerHTML = '<div id="status">No news</div>'; return; }
    const tier = c => c.startsWith('quake') ? 0 : c === 'high' ? 1 : c === 'medium' || c === 'running' ? 2 : 3;
    const items = data.map(item => {
        const count = item.count || item.source.length;
        return { ...item, cls: item.cls || (count >= 4 ? 'high' : count >= 3 ? 'medium' : 'low') };
    });
    items.sort((a, b) => tier(a.cls) - tier(b.cls));
    feed.innerHTML = items.map(item => `
        <article class="${item.cls}"${item.url ? ` onclick="window.open('${item.url}', '_blank')"` : ''}>
            <h2>${item.title}</h2>
            <div class="sources">${item.source.join(' · ')}</div>
        </article>
    `).join('');
};
