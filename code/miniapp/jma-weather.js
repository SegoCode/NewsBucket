export const JMA = 'https://www.jma.go.jp/bosai/';

export class JmaRateLimit extends Error {
    constructor(ms) {
        super('rate-limit');
        this.retryAfterMs = ms;
    }
}

const retryAfterMs = res => {
    const h = res.headers.get('retry-after');
    if (h != null && h !== '') {
        const sec = Number(h);
        if (Number.isFinite(sec)) return Math.max(0, sec * 1000);
        const at = Date.parse(h);
        if (Number.isFinite(at)) return Math.max(0, at - Date.now());
    }
    return 60_000;
};

export const jmaFetch = async url => {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.status === 429 || (res.status === 503 && res.headers.get('retry-after'))) {
        throw new JmaRateLimit(retryAfterMs(res));
    }
    if (!res.ok) throw new Error(res.status);
    return res;
};


const sentenceCase = s => s && s[0].toUpperCase() + s.slice(1).toLowerCase();

const formatAlertName = (s, lang) => {
    if (!s) return { text: '', level: 0 };
    const text = s.normalize('NFKC');
    const m = text.match(/\[(?:レベル|Level)\s*(\d+)[^\]]*\]/i);
    const raw = text
        .replace(/\[(?:レベル|Level)\s*\d+[^\]]*\]/gi, '')
        .replace(/\s*alert$|\s*アラート$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    const name = lang === 'jp' ? raw : sentenceCase(raw);
    const level = m ? +m[1] : 0;
    if (level <= 1) return { text: name, level };
    return {
        text: lang === 'jp' ? `${name}, レベル${level}` : `${name}, Level ${level}`,
        level,
    };
};

export const weatherItems = (jma, lang) =>
    jma.alerts.map(a => {
        const { text, level } = formatAlertName(lang === 'jp' ? a.jp : a.en, lang === 'jp' ? 'jp' : 'en');
        const pulse = level >= 5 ? ' weather-l5' : level >= 4 ? ' weather-l4' : level >= 3 ? ' quake-recent' : '';
        return {
            title: `${lang === 'jp' ? '気象警報' : 'Weather alert'}: ${text}`,
            source: ['JMA', jma.prefecture],
            cls: 'quake-high' + pulse,
            url: `https://www.jma.go.jp/bosai/#lang=${lang === 'jp' ? 'jp' : 'en'}&pattern=default&area_type=offices&area_code=${a.office || jma.office}`,
        };
    });

export const placeFromCoords = async coords => {
    const placeRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`);
    if (!placeRes.ok) throw new Error(placeRes.status);
    const place = await placeRes.json();
    const city = place.city || place.locality || place.principalSubdivision || '';
    const country = place.countryName || place.countryCode || '';
    const pref = place.countryCode === 'JP' && place.principalSubdivisionCode?.split('-')[1];
    return { city, country, pref, prefecture: place.principalSubdivision || '' };
};

export const fetchWeatherAlerts = async coords => {
    const { city, country, pref, prefecture } = await placeFromCoords(coords);
    const named = { city, country, prefecture, alerts: [] };
    if (!pref) return named;
    let areas, cfg;
    try {
        [areas, cfg] = await Promise.all([
            jmaFetch(`${JMA}common/const/area.json`).then(r => r.json()),
            jmaFetch(`${JMA}panel/const/setting.json`).then(r => r.json()),
        ]);
    } catch (e) {
        if (e instanceof JmaRateLimit) throw e;
        throw new Error('jma');
    }
    const offices = Object.entries(areas.offices || {}).filter(([code]) => code.startsWith(pref));
    if (!offices.length) return named;
    const owner = new Map();
    for (const [code, o] of offices) {
        for (const c10 of o.children || []) {
            owner.set(c10, code);
            for (const c15 of areas.class10s[c10]?.children || []) owner.set(c15, code);
        }
    }
    for (const [c20, { parent }] of Object.entries(areas.class20s || {})) {
        if (owner.has(parent)) owner.set(c20, owner.get(parent));
    }
    const codes = new Set(owner.keys());
    const panels = (cfg.lines?.[1] || []).map(key => [key, cfg.panels?.[key]]).filter(([, p]) => p?.url);
    const urlKeys = [...new Set(panels.flatMap(([, p]) => p.url))];
    const data = {};
    await Promise.all(urlKeys.map(async key => {
        try {
            const res = await jmaFetch(JMA + cfg.urls[key]);
            data[key] = await res.json();
        } catch (e) {
            if (e instanceof JmaRateLimit) throw e;
        }
    }));
    if (urlKeys.length && urlKeys.every(key => !data[key])) throw new Error('jma-panels');
    const alerts = panels.flatMap(([key, p]) => {
        const hits = p.url
            .flatMap(u => Object.values(data[u]?.[key] || {}))
            .flatMap(m => Object.entries(m))
            .filter(([c]) => codes.has(c));
        const level = hits.map(([, v]) => v).sort((a, b) => Number(a) - Number(b)).pop();
        if (!level) return [];
        const area = hits.find(([, v]) => v === level)[0];
        const pick = n => (typeof n === 'string' ? n : n?.[level])?.replace(/<[^>]+>/g, ' ').trim();
        const en = pick(p.enName), jp = pick(p.name);
        return en && jp ? [{ en, jp, office: owner.get(area) }] : [];
    });
    return {
        ...named,
        prefecture,
        office: alerts.find(a => a.office)?.office,
        alerts,
    };
};
