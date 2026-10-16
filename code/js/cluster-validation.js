const isCluster = (cluster) =>
	cluster &&
	typeof cluster === "object" &&
	!Array.isArray(cluster) &&
	typeof cluster.title === "string" &&
	cluster.title.trim().length > 0 &&
	typeof cluster.summary === "string" &&
	cluster.summary.trim().length > 0 &&
	Array.isArray(cluster.source) &&
	cluster.source.every(
		(source) => typeof source === "string" && source.trim().length > 0,
	) &&
	new Set(cluster.source).size === cluster.source.length &&
	Number.isInteger(cluster.count) &&
	cluster.count === cluster.source.length &&
	cluster.count >= 2;

export const isValidClusters = (clusters, availableSources) => {
	if (!Array.isArray(clusters)) return false;
	const remainingSources = availableSources
		? [...availableSources].reduce(
				(counts, source) => counts.set(source, (counts.get(source) || 0) + 1),
				new Map(),
			)
		: undefined;

	for (const cluster of clusters) {
		if (!isCluster(cluster)) return false;
		if (!remainingSources) continue;
		for (const source of cluster.source) {
			const remaining = remainingSources.get(source) || 0;
			if (remaining === 0) return false;
			remainingSources.set(source, remaining - 1);
		}
	}

	return true;
};

export const isValidTranslation = (translated, original) =>
	isValidClusters(original) &&
	Array.isArray(translated) &&
	translated.length === original.length &&
	translated.every((cluster, index) => {
		const sourceCluster = original[index];
		return (
			isCluster(cluster) &&
			cluster.count === sourceCluster.count &&
			cluster.source.every((source) => sourceCluster.source.includes(source))
		);
	});

export const normalizeClusters = (clusters) =>
	clusters.map(({ title, summary, source, count }) => ({
		title: title.trim(),
		summary: summary.trim(),
		source,
		count,
	}));
