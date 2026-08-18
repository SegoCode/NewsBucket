import { JMA } from './jma-weather.js';

const CF = 'https://www.cloudflare.com/cdn-cgi/trace';
const GH = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com/SegoCode/NewsBucket/main/code/prompts/cluster.md';

const env = {
    source: '',
    ip: '',
    city: '',
    country: '',
    lat: null,
    lon: null,
    geo: 'unknown',
};

let onPlace;

export const setPlace = patch => {
    if (env.source && env.source !== 'IP' && patch.source === 'IP') {
        const { source, lat, lon, city, country, ...rest } = patch;
        Object.assign(env, rest);
    } else {
        Object.assign(env, patch);
    }
    onPlace?.();
};

const ping = async (url, cors) => {
    const t = performance.now();
    try {
        const res = await fetch(url, {
            cache: 'no-store',
            mode: cors ? 'cors' : 'no-cors',
            signal: AbortSignal.timeout(4000),
        });
        const ms = Math.round(performance.now() - t);
        return { ok: !cors || res.ok, limited: res.status === 403 || res.status === 429, ms };
    } catch {
        return { ok: false, ms: Math.round(performance.now() - t) };
    }
};

const place = () => {
    const named = [env.city, env.country].filter(Boolean).join(', ');
    const gps = env.lat != null && env.lon != null && `${env.lat.toFixed(3)}, ${env.lon.toFixed(3)}`;
        const where = named || gps || '—';
    return env.source ? `${where} · ${env.source}` : where;
};

const mark = (el, probe) => {
    if (!probe) {
        el.textContent = '—';
        el.className = '';
        return;
    }
    const state = probe.limited ? 'medium' : probe.ok ? 'ok' : 'high';
    el.textContent = `${probe.limited ? 'rate limit' : probe.ok ? 'ok' : 'down'} · ${probe.ms}ms`;
    el.className = state;
};

export const createDiag = el => {
    const $ = id => el.querySelector('#' + id);
    let timer;
    const paintMeta = () => {
        const geo = env.geo || 'unknown';
        $('diag-geo').textContent = geo;
        $('diag-geo').className = geo === 'approved' ? 'ok' : geo === 'rejected' ? 'high' : '';
        $('diag-place').textContent = place();
        $('diag-ip').textContent = env.ip || '—';
        $('diag-ip').title = env.ip || '';
    };
    let gh;
    let raw;
    const paint = async () => {
        paintMeta();
        const once = !gh;
        const [cf, github, rawHit, jma] = await Promise.all([
            ping(CF, false),
            once ? ping(GH, true) : gh,
            once ? ping(RAW, true) : raw,
            ping(JMA + 'common/const/area.json', true),
        ]);
        if (once) {
            gh = github;
            raw = rawHit;
        }
        if (el.hidden) return;
        mark($('diag-gh'), gh);
        mark($('diag-raw'), raw);
        mark($('diag-cf'), cf);
        mark($('diag-jma'), jma);
    };
    onPlace = () => {
        if (!el.hidden) paintMeta();
    };
    return visible => {
        el.hidden = !visible;
        if (!visible) {
            clearInterval(timer);
            timer = null;
            return;
        }
        if (timer) {
            paintMeta();
            return;
        }
        paint();
        timer = setInterval(paint, 5000);
    };
};
