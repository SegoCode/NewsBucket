export const TOKYO = [35.68, 139.76];

export const inJapan = (lat, lng) =>
    lat >= 24 && lat <= 46 && lng >= 122 && lng <= 146;

export const nearest = (spots, lat, lng, n = 2) => {
    const [hereLat, hereLng] = inJapan(lat, lng) ? [lat, lng] : TOKYO;
    const k = Math.cos((hereLat * Math.PI) / 180);
    const best = [];
    for (const s of spots) {
        if (s.is_live !== true || !s.video_id) continue;
        const d = (s.lat - hereLat) ** 2 + ((s.lng - hereLng) * k) ** 2;
        if (best.length < n || d < best[best.length - 1].d) {
            best.push({ s, d });
            best.sort((a, b) => a.d - b.d);
            if (best.length > n) best.pop();
        }
    }
    return best.map((x) => x.s);
};

export const nearestTwo = (spots, lat, lng) => nearest(spots, lat, lng, 2);

export const pairAt = (ids, page) =>
    [ids[page * 2], ids[page * 2 + 1]].filter((id) => id != null);

export const nextPage = (count, page) =>
    count < 3 ? page : (page + 1) % Math.ceil(count / 2);

const CAMERAS = 'https://raw.githubusercontent.com/SegoCode/NewsBucket/main/code/miniapp/livecameras.json';
const CACHE_KEY = 'nb-cams';
const CACHE_MS = 6 * 60 * 60 * 1000;

let spotsPromise;
let spotsAt = 0;

export const loadCameras = () => {
    if (spotsPromise && Date.now() - spotsAt < CACHE_MS) return spotsPromise;
    spotsAt = Date.now();
    spotsPromise = (async () => {
        try {
            const hit = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
            if (hit?.spots && Date.now() - hit.at < CACHE_MS) return hit.spots;
        } catch {}
        const res = await fetch(CAMERAS);
        if (!res.ok) throw new Error(res.status);
        const spots = ((await res.json()).spots || []).map(s => ({
            lat: s.lat,
            lng: s.lng,
            video_id: s.video_id,
            is_live: s.is_live,
        }));
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), spots })); } catch {}
        return spots;
    })().catch(() => {
        spotsPromise = null;
        spotsAt = 0;
        return [];
    });
    return spotsPromise;
};
