const URL = 'https://www.bankofcanada.ca/valet/observations/FXUSDCAD,FXEURCAD,FXJPYCAD/json?recent=10';
const PAGE = 'https://www.bankofcanada.ca/rates/exchange/daily-exchange-rates/';
const CACHE_KEY = 'nb-fx';
const CACHE_MS = 6 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const num = v => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
};

const parseObs = obs => {
    const usd = num(obs?.FXUSDCAD?.v);
    const eur = num(obs?.FXEURCAD?.v);
    const jpy = num(obs?.FXJPYCAD?.v);
    if (!usd || !eur || !jpy) return null;
    return { usd, eur, jpy };
};

const triplet = row => {
    const usd = num(row?.usd);
    const eur = num(row?.eur);
    const jpy = num(row?.jpy);
    if (!usd || !eur || !jpy) return null;
    return { usd, eur, jpy };
};

const parseRates = data => {
    const rows = (Array.isArray(data?.observations) ? data.observations : [])
        .map(o => ({ t: Date.parse(o?.d), rates: parseObs(o) }))
        .filter(o => Number.isFinite(o.t) && o.rates)
        .sort((a, b) => b.t - a.t);
    if (!rows.length) return null;
    const weekAt = rows[0].t - WEEK_MS;
    const prev = rows.find(o => o.t <= weekAt);
    return { now: rows[0].rates, week: prev?.rates || null };
};

const yenOf = (row, es) => (es ? row.eur : row.usd) / row.jpy;
const signed = pct => `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;

let ratesPromise;
let ratesAt = 0;

const loadRates = () => {
    if (ratesPromise && Date.now() - ratesAt < CACHE_MS) return ratesPromise;
    ratesAt = Date.now();
    ratesPromise = (async () => {
        try {
            const hit = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
            if (triplet(hit?.now) && Date.now() - hit.at < CACHE_MS) {
                return { now: hit.now, week: triplet(hit.week) };
            }
        } catch {}
        const res = await fetch(URL);
        if (!res.ok) throw new Error(res.status);
        const rates = parseRates(await res.json());
        if (!rates) throw new Error('shape');
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), ...rates })); } catch {}
        return rates;
    })().catch(() => {
        ratesPromise = null;
        ratesAt = 0;
        return null;
    });
    return ratesPromise;
};

export const fetchFxRate = async (lang = 'en') => {
    const rates = await loadRates();
    if (!rates) return [];
    const es = lang === 'es';
    const yen = yenOf(rates.now, es);
    const prev = rates.week ? yenOf(rates.week, es) : null;
    const pct = prev ? (yen - prev) / prev * 100 : null;
    const pctHtml = Number.isFinite(pct)
        ? ` · <span class="${pct >= 0 ? 'ok' : 'high'}">${signed(pct)}</span>`
        : '';
    return [{
        title: `<span>${es ? '1 EUR' : '1 USD'}</span><span>¥${yen.toFixed(2)}${pctHtml}</span>`,
        source: ['bankofcanada.ca'],
        cls: 'quake-high spike',
        url: PAGE,
    }];
};
