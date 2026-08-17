import { JMA } from './jma-weather.js';

const CF = 'https://www.cloudflare.com/cdn-cgi/trace';
const GH = 'https://api.github.com';

const env = {
    source: '',
    ip: '',
    city: '',
    country: '',
    lat: null,
    lon: null,
};

let onPlace;

export const setPlace = patch => {
    if (env.source && env.source !== 'IP' && patch.source === 'IP') {
        const { source, lat, lon, ...rest } = patch;
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
        return { ok: !cors || res.ok, limited: res.status === 403, ms };
    } catch {
        return { ok: false, ms: Math.round(performance.now() - t) };
    }
};

const place = () => {
    const named = [env.city, env.country].filter(Boolean).join(', ');
    const gps = env.lat != null && env.lon != null && `${env.lat.toFixed(3)}, ${env.lon.toFixed(3)}`;
    const where = (env.source !== 'IP' && gps) || named || gps || '—';
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
        $('diag-place').textContent = place();
        $('diag-ip').textContent = env.ip || '—';
    };
    let gh;
    const paint = async () => {
        paintMeta();
        const once = !gh;
        const [cf, github, jma] = await Promise.all([
            ping(CF, false),
            once ? ping(GH, true) : gh,
            ping(JMA + 'common/const/area.json', true),
        ]);
        if (once) gh = github;
        if (el.hidden) return;
        mark($('diag-gh'), gh);
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
