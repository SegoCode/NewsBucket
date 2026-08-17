const API = 'https://api.github.com/repos/SegoCode/NewsBucket/actions';
const STEPS = [
    ['Cluster tech', 'Tech digest'],
    ['Cluster finance', 'Finance digest'],
    ['Cluster gaming', 'Gaming digest'],
    ['Cluster japan', 'Japan digest'],
    ['Translate clusters', 'Translated editions'],
];

const stamp = value =>
    value &&
    new Date(value).toLocaleString([], {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).replace(',', '');

const duration = (start, end) => {
    if (!start || !end) return;
    const ms = Date.parse(end) - Date.parse(start);
    if (!Number.isFinite(ms) || ms < 0) return;
    const m = Math.floor(ms / 60000);
    const s = Math.round((ms % 60000) / 1000);
    if (m && s) return `${m}m ${s}s`;
    if (m) return `${m}m`;
    return `${s}s`;
};

const failedStep = job =>
    job?.steps?.find(step =>
        step.conclusion === 'failure' &&
        !/^(Set up job|Complete job|Post )/i.test(step.name)
    )?.name;

const CACHE_KEY = 'nb-actions';
const CACHE_MS = 6 * 60 * 60 * 1000;

const loadRun = async () => {
    try {
        const hit = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (hit?.run && Date.now() - hit.at < CACHE_MS) return hit;
    } catch {}
    const { workflow_runs: [run] = [] } = await fetch(`${API}/workflows/update-news.yml/runs?per_page=1`).then(r => r.json());
    if (!run) return null;
    const { jobs = [] } = await fetch(`${API}/runs/${run.id}/jobs`).then(r => r.json());
    const hit = { at: Date.now(), run, jobs };
    if (run.status === 'completed') {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(hit)); } catch {}
    }
    return hit;
};

export const pipelineItems = async () => {
    const hit = await loadRun();
    if (!hit) return [];
    const { run, jobs } = hit;
    const byName = Object.fromEntries(jobs.map(job => [job.name, job]));
    return STEPS.map(([name, title]) => {
        const job = byName[name];
        const ok = job?.conclusion === 'success';
        const running = !job || job.status !== 'completed';
        return {
            title,
            source: [
                stamp(job?.completed_at || job?.started_at || run.updated_at),
                duration(job?.started_at, job?.completed_at || (running && new Date().toISOString())),
                !ok && !running && failedStep(job),
            ].filter(Boolean),
            cls: ok ? 'ok' : running ? 'running' : 'high',
            url: job?.html_url || run.html_url,
        };
    });
};
