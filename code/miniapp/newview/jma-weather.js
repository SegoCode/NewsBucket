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
    jma.alerts.map(a => ({
        title: `${lang === 'jp' ? '気象警報' : 'Weather alert'}: ${formatAlertName(lang === 'jp' ? a.jp : a.en, lang === 'jp' ? 'jp' : 'en')}`,
        source: ['JMA', jma.prefecture],
        cls: 'quake-high',
        url: `https://www.jma.go.jp/bosai/#lang=${lang === 'jp' ? 'jp' : 'en'}&pattern=default&area_type=japan&area_code=010000`,
    }));

export const fetchWeatherAlerts = async coords => {
    const place = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`).then(r => r.json());
    const pref = place.countryCode === 'JP' && place.principalSubdivisionCode?.split('-')[1];
    if (!pref) return null;
    const prefecture = place.principalSubdivision;
    const [areas, cfg] = await Promise.all([
        fetch(`${JMA}common/const/area.json`).then(r => r.json()),
        fetch(`${JMA}panel/const/setting.json`).then(r => r.json()),
    ]);
    const offices = Object.entries(areas.offices).filter(([code]) => code.startsWith(pref));
    if (!offices.length) return null;
    const c10 = offices.flatMap(([, o]) => o.children || []);
    const c15 = c10.flatMap(c => areas.class10s[c]?.children || []);
    const codes = new Set([...c10, ...c15,
        ...Object.keys(areas.class20s).filter(k => c10.includes(areas.class20s[k].parent) || c15.includes(areas.class20s[k].parent))]);
    const panels = cfg.lines[1].map(key => [key, cfg.panels[key]]);
    const urlKeys = [...new Set(panels.flatMap(([, p]) => p.url))];
    const data = Object.fromEntries(await Promise.all(
        urlKeys.map(async key => [key, await fetch(JMA + cfg.urls[key]).then(r => r.json())])
    ));
    return {
        prefecture,
        alerts: panels.flatMap(([key, p]) => {
            const level = p.url
                .flatMap(u => Object.values(data[u]?.[key] || {}))
                .flatMap(m => Object.entries(m))
                .filter(([c]) => codes.has(c))
                .map(([, v]) => v)
                .sort()
                .pop();
            if (!level) return [];
            const pick = n => (typeof n === 'string' ? n : n?.[level])?.replace(/<[^>]+>/g, ' ').trim();
            const en = pick(p.enName), jp = pick(p.name);
            return en && jp ? [{ en, jp }] : [];
        }),
    };
};
