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
    const acceptLocation = (source, coords) => {
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
        if (err?.code === 1) setPlace({ geo: 'rejected' });
    };
    const requestLocation = ({ force } = {}) => {
        if (native?.initData && native.LocationManager) {
            native.LocationManager.init(() => {
                const lm = native.LocationManager;
                lm.getLocation(coords => {
                    if (!coords) {
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
    return { requestLocation, syncWatch, fetchIp };
};
