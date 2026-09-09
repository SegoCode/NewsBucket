const GAINERS = 'https://finance-query.com/v2/screeners/day-gainers';
const LOSERS = 'https://finance-query.com/v2/screeners/day-losers';
const MIN = 15;
const MAX = 5;
const UP = { en: 'Spike', es: 'Subida', jp: '急騰' };
const DOWN = { en: 'Drop', es: 'Caída', jp: '急落' };
const CACHE_KEY = 'nb-spikes';
const CACHE_MS = 3 * 60 * 60 * 1000;

const signed = pct => `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;

const quotesOf = async url => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const quotes = (await res.json()).quotes;
    if (!Array.isArray(quotes)) throw new Error('shape');
    return quotes;
};

const pickQuotes = quotes => quotes
    .flatMap(q => {
        const pct = Number(q?.regularMarketChangePercent);
        const symbol = q?.symbol;
        if (!symbol || !Number.isFinite(pct) || Math.abs(pct) < MIN) return [];
        return [{ symbol, name: q.shortName || symbol, pct }];
    })
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, MAX);

let quotesPromise;
let quotesAt = 0;

const loadQuotes = () => {
    if (quotesPromise && Date.now() - quotesAt < CACHE_MS) return quotesPromise;
    quotesAt = Date.now();
    quotesPromise = (async () => {
        let hit;
        try {
            hit = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        } catch {
            hit = null;
        }
        const cached = Array.isArray(hit?.quotes) && hit.quotes.length ? hit.quotes : null;
        if (cached && Date.now() - hit.at < CACHE_MS) return cached;
        const settled = await Promise.allSettled([quotesOf(GAINERS), quotesOf(LOSERS)]);
        const ok = settled.filter(s => s.status === 'fulfilled');
        if (!ok.length) {
            if (cached) return cached;
            throw new Error('down');
        }
        const quotes = pickQuotes(ok.flatMap(s => s.value));
        if (quotes.length) {
            try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), quotes })); } catch {}
            return quotes;
        }
        try { localStorage.removeItem(CACHE_KEY); } catch {}
        return [];
    })().catch(() => {
        quotesPromise = null;
        quotesAt = 0;
        return [];
    });
    return quotesPromise;
};

export const fetchFinanceSpikes = async (lang = 'en') =>
    (await loadQuotes()).map(q => {
        const up = q.pct >= 0;
        const label = (up ? UP : DOWN)[lang] || UP.en;
        return {
            title: `<span>${label}: ${q.name}</span><span>${q.symbol} · <span class="${up ? 'ok' : 'high'}">${signed(q.pct)}</span></span>`,
            source: ['finance.yahoo.com'],
            cls: 'quake-high spike',
            url: `https://finance.yahoo.com/quote/${encodeURIComponent(q.symbol)}`,
        };
    });
