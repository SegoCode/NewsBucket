export const JMA = 'https://www.jma.go.jp/bosai/';

const sentenceCase = s => s && s[0].toUpperCase() + s.slice(1).toLowerCase();

const formatAlertName = (s, lang) => {
    if (!s) return '';
    const text = s.normalize('NFKC');
    const m = text.match(/\[(?:レベル|Level)\s*(\d+)[^\]]*\]/i);
    const raw = text
        .replace(/\[(?:レベル|Level)\s*\d+[^\]]*\]/gi, '')
        .replace(/\s*alert$|\s*アラート$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    const name = lang === 'jp' ? raw : sentenceCase(raw);
    const n = m ? +m[1] : 0;
    if (n <= 1) return name;
    return lang === 'jp' ? `${name}, レベル${n}` : `${name}, Level ${n}`;
};

export const weatherItems = (jma, lang) =>
    jma.alerts.map(a => {
        const title = `${lang === 'jp' ? '気象警報' : 'Weather alert'}: ${formatAlertName(lang === 'jp' ? a.jp : a.en, lang === 'jp' ? 'jp' : 'en')}`;
        return {
            title,
            source: ['JMA', jma.prefecture],
            cls: 'quake-high' + (/[3-9]|\d{2,}/.test(title) ? ' quake-recent' : ''),
            url: `https://www.jma.go.jp/bosai/#lang=${lang === 'jp' ? 'jp' : 'en'}&pattern=default&area_type=offices&area_code=${a.office || jma.office}`,
        };
    });

export const fetchWeatherAlerts = async coords => {
    const placeRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`);
    if (!placeRes.ok) return { city: '', country: '', prefecture: '', alerts: [] };
    const place = await placeRes.json();
    const city = place.city || place.locality || place.principalSubdivision || '';
    const country = place.countryName || place.countryCode || '';
    const named = { city, country, prefecture: '', alerts: [] };
    const pref = place.countryCode === 'JP' && place.principalSubdivisionCode?.split('-')[1];
    if (!pref) return named;
    const prefecture = place.principalSubdivision;
    let areas, cfg;
    try {
        [areas, cfg] = await Promise.all([
            fetch(`${JMA}common/const/area.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
            fetch(`${JMA}panel/const/setting.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
        ]);
    } catch {
        return named;
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
            const res = await fetch(JMA + cfg.urls[key]);
            if (!res.ok) return;
            data[key] = await res.json();
        } catch {}
    }));
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
