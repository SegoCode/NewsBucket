const QUAKE = 'https://www.jma.go.jp/bosai/quake/data/list.json';

export const quakeItems = async lang => {
    const res = await fetch(QUAKE);
    if (!res.ok) return [];
    const raw = (await res.json()).filter(q =>
        q.mag && q.cod &&
        Date.now() - Date.parse(q.at) < 2 * 864e5 &&
        parseFloat(q.mag) >= 4.5
    );
    const quakes = [...new Map(
        raw.sort((a, b) => a.ctt.localeCompare(b.ctt)).map(q => [q.eid, q])
    ).values()];
    return quakes.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).map(q => {
        const [lat, lon] = q.cod.match(/[+-]\d+\.?\d*/g);
        const recent = Date.now() - Date.parse(q.at) < 2 * 36e5;
        return {
            title: `M${q.mag} | ${lang === 'jp' ? q.anm : q.en_anm}`,
            source: ['JMA', new Date(q.at).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '')],
            cls: 'quake-high' + (recent ? ' quake-recent' : ''),
            url: `geo:0,0?q=${lat},${lon}`
        };
    });
};
