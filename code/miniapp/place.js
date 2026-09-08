export const PREFECTURES = [
    { iso: '01', name: 'Hokkaido', lat: 43.06, lon: 141.35 },
    { iso: '02', name: 'Aomori', lat: 40.82, lon: 140.74 },
    { iso: '03', name: 'Iwate', lat: 39.70, lon: 141.15 },
    { iso: '04', name: 'Miyagi', lat: 38.27, lon: 140.87 },
    { iso: '05', name: 'Akita', lat: 39.72, lon: 140.10 },
    { iso: '06', name: 'Yamagata', lat: 38.24, lon: 140.36 },
    { iso: '07', name: 'Fukushima', lat: 37.75, lon: 140.47 },
    { iso: '08', name: 'Ibaraki', lat: 36.34, lon: 140.45 },
    { iso: '09', name: 'Tochigi', lat: 36.57, lon: 139.88 },
    { iso: '10', name: 'Gunma', lat: 36.39, lon: 139.06 },
    { iso: '11', name: 'Saitama', lat: 35.86, lon: 139.65 },
    { iso: '12', name: 'Chiba', lat: 35.60, lon: 140.12 },
    { iso: '13', name: 'Tokyo', lat: 35.68, lon: 139.76 },
    { iso: '14', name: 'Kanagawa', lat: 35.45, lon: 139.64 },
    { iso: '15', name: 'Niigata', lat: 37.90, lon: 139.02 },
    { iso: '16', name: 'Toyama', lat: 36.70, lon: 137.21 },
    { iso: '17', name: 'Ishikawa', lat: 36.59, lon: 136.63 },
    { iso: '18', name: 'Fukui', lat: 36.07, lon: 136.22 },
    { iso: '19', name: 'Yamanashi', lat: 35.66, lon: 138.57 },
    { iso: '20', name: 'Nagano', lat: 36.65, lon: 138.18 },
    { iso: '21', name: 'Gifu', lat: 35.39, lon: 136.72 },
    { iso: '22', name: 'Shizuoka', lat: 34.98, lon: 138.38 },
    { iso: '23', name: 'Aichi', lat: 35.18, lon: 136.91 },
    { iso: '24', name: 'Mie', lat: 34.73, lon: 136.51 },
    { iso: '25', name: 'Shiga', lat: 35.00, lon: 135.87 },
    { iso: '26', name: 'Kyoto', lat: 35.02, lon: 135.76 },
    { iso: '27', name: 'Osaka', lat: 34.69, lon: 135.50 },
    { iso: '28', name: 'Hyogo', lat: 34.69, lon: 135.18 },
    { iso: '29', name: 'Nara', lat: 34.69, lon: 135.83 },
    { iso: '30', name: 'Wakayama', lat: 34.23, lon: 135.17 },
    { iso: '31', name: 'Tottori', lat: 35.50, lon: 134.24 },
    { iso: '32', name: 'Shimane', lat: 35.47, lon: 133.05 },
    { iso: '33', name: 'Okayama', lat: 34.66, lon: 133.93 },
    { iso: '34', name: 'Hiroshima', lat: 34.40, lon: 132.46 },
    { iso: '35', name: 'Yamaguchi', lat: 34.19, lon: 131.47 },
    { iso: '36', name: 'Tokushima', lat: 34.07, lon: 134.56 },
    { iso: '37', name: 'Kagawa', lat: 34.34, lon: 134.04 },
    { iso: '38', name: 'Ehime', lat: 33.84, lon: 132.77 },
    { iso: '39', name: 'Kochi', lat: 33.56, lon: 133.53 },
    { iso: '40', name: 'Fukuoka', lat: 33.61, lon: 130.42 },
    { iso: '41', name: 'Saga', lat: 33.25, lon: 130.30 },
    { iso: '42', name: 'Nagasaki', lat: 32.75, lon: 129.87 },
    { iso: '43', name: 'Kumamoto', lat: 32.79, lon: 130.74 },
    { iso: '44', name: 'Oita', lat: 33.24, lon: 131.61 },
    { iso: '45', name: 'Miyazaki', lat: 31.91, lon: 131.42 },
    { iso: '46', name: 'Kagoshima', lat: 31.56, lon: 130.56 },
    { iso: '47', name: 'Okinawa', lat: 26.21, lon: 127.68 },
];

export const prefectureAt = iso => PREFECTURES.find(p => p.iso === iso);

export const prefectureFor = (place = {}) => {
    const { city, lat, lon } = place;
    if (city) {
        const named = PREFECTURES.find(p => p.name === city);
        if (named) return named;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    let best;
    let bestD = Infinity;
    for (const p of PREFECTURES) {
        const d = (p.lat - lat) ** 2 + (p.lon - lon) ** 2;
        if (d < bestD) {
            bestD = d;
            best = p;
        }
    }
    return bestD < 0.08 ? best : undefined;
};

const env = {
    source: '',
    ip: '',
    city: '',
    country: '',
    lat: null,
    lon: null,
    geo: 'unknown',
};

const listeners = new Set();

export const getPlace = () => ({ ...env });

export const setPlace = patch => {
    if (env.source && env.source !== 'IP' && patch.source === 'IP') {
        const rest = { ...patch };
        delete rest.source;
        delete rest.lat;
        delete rest.lon;
        if (env.city) delete rest.city;
        if (env.country) delete rest.country;
        Object.assign(env, rest);
    } else {
        Object.assign(env, patch);
    }
    for (const fn of listeners) fn();
};

export const watchPlace = fn => {
    listeners.add(fn);
};

export const createPlace = ({ native, onCoords }) => {
    let precise;
    let prior;
    const acceptLocation = (source, coords) => {
        if (env.source === 'Manual' && source !== 'Manual') return;
        precise = true;
        setPlace({
            source,
            lat: coords.latitude,
            lon: coords.longitude,
            geo: 'approved',
        });
        onCoords?.(coords);
    };
    const rejectLocation = err => {
        if (env.source === 'Manual') return;
        if (err?.code === 1) setPlace({ geo: 'rejected' });
    };
    const requestLocation = ({ force } = {}) => {
        if (native?.initData && native.LocationManager) {
            native.LocationManager.init(() => {
                const lm = native.LocationManager;
                lm.getLocation(coords => {
                    if (!coords) {
                        if (env.source === 'Manual') return;
                        setPlace({ geo: lm.isAccessGranted === false ? 'rejected' : 'unknown' });
                        return;
                    }
                    acceptLocation('Telegram', coords);
                });
            });
            return;
        }
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => acceptLocation('Browser', coords),
            rejectLocation,
            { enableHighAccuracy: !!force, maximumAge: force ? 0 : 300_000, timeout: 8_000 },
        );
    };
    let browserWatch;
    let telegramPoll;
    const syncWatch = watching => {
        if (!watching) {
            if (browserWatch != null) navigator.geolocation?.clearWatch(browserWatch);
            clearInterval(telegramPoll);
            browserWatch = telegramPoll = null;
            return;
        }
        if (native?.initData && native.LocationManager) {
            requestLocation({ force: true });
            telegramPoll ||= setInterval(() => requestLocation({ force: true }), 60_000);
        } else if (navigator.geolocation?.watchPosition && browserWatch == null) {
            browserWatch = navigator.geolocation.watchPosition(
                ({ coords }) => acceptLocation('Browser', coords),
                rejectLocation,
                { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
            );
        }
    };
    const fetchIp = () => {
        fetch('https://ip.guide/')
            .then(r => r.json())
            .then(data => {
                setPlace({
                    ip: data.ip,
                    city: data.location?.city,
                    country: data.location?.country,
                    lat: data.location?.latitude,
                    lon: data.location?.longitude,
                    source: 'IP',
                });
                if (!native?.initData && !precise) onCoords?.(data.location);
            })
            .catch(() => {});
    };
    const setManual = iso => {
        const pref = prefectureAt(iso);
        if (!pref) return;
        if (env.source !== 'Manual') prior = { ...env, precise: !!precise };
        precise = true;
        setPlace({
            source: 'Manual',
            lat: pref.lat,
            lon: pref.lon,
            geo: 'approved',
            city: pref.name,
            country: 'Japan',
        });
        onCoords?.({ latitude: pref.lat, longitude: pref.lon });
    };
    const resetManual = () => {
        if (env.source !== 'Manual') return false;
        const snap = prior;
        prior = null;
        if (!snap) {
            precise = false;
            env.source = '';
            setPlace({ source: '', lat: null, lon: null, city: '', country: '', geo: 'unknown' });
            onCoords?.(null);
            return true;
        }
        precise = snap.precise;
        env.source = snap.source;
        setPlace({
            source: snap.source,
            ip: snap.ip,
            city: snap.city,
            country: snap.country,
            lat: snap.lat,
            lon: snap.lon,
            geo: snap.geo,
        });
        if (Number.isFinite(snap.lat) && Number.isFinite(snap.lon)) {
            onCoords?.({ latitude: snap.lat, longitude: snap.lon });
        } else {
            onCoords?.(null);
        }
        return true;
    };
    return { requestLocation, syncWatch, fetchIp, setManual, resetManual };
};
