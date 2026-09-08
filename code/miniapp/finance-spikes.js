const GAINERS = 'https://finance-query.com/v2/screeners/day-gainers';
const LOSERS = 'https://finance-query.com/v2/screeners/day-losers';
const MIN = 15;
const MAX = 5;
const UP = { en: 'Spike', es: 'Subida', jp: '急騰' };
const DOWN = { en: 'Drop', es: 'Caída', jp: '急落' };

const signed = pct => `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;

const quotesOf = async url => {
    const res = await fetch(url);
    if (!res.ok) return [];
    const quotes = (await res.json()).quotes;
    return Array.isArray(quotes) ? quotes : [];
};

export const fetchFinanceSpikes = async (lang = 'en') => {
    const settled = await Promise.allSettled([quotesOf(GAINERS), quotesOf(LOSERS)]);
    const quotes = settled.flatMap(s => s.status === 'fulfilled' ? s.value : []);
    return quotes
        .flatMap(q => {
            const pct = Number(q?.regularMarketChangePercent);
            const symbol = q?.symbol;
            if (!symbol || !Number.isFinite(pct) || Math.abs(pct) < MIN) return [];
            return [{ symbol, name: q.shortName || symbol, pct }];
        })
        .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
        .slice(0, MAX)
        .map(q => ({
            title: `${(q.pct >= 0 ? UP : DOWN)[lang] || UP.en}: ${q.name} (${q.symbol}) ${signed(q.pct)}`,
            source: [q.symbol],
            cls: 'quake-high',
            url: `https://finance.yahoo.com/quote/${encodeURIComponent(q.symbol)}`,
        }));
};
