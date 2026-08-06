const CLUSTER_KEYS = ["count", "source", "summary", "title"];

const hasClusterKeys = (cluster) =>
	cluster &&
	typeof cluster === "object" &&
	!Array.isArray(cluster) &&
	Object.keys(cluster).sort().join(",") === CLUSTER_KEYS.join(",");

const isCluster = (cluster) =>
	hasClusterKeys(cluster) &&
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
	if (!Array.isArray(clusters) || clusters.length === 0) return false;
	const remainingSources = availableSources
		? [...availableSources].reduce(
				(counts, source) => counts.set(source, (counts.get(source) || 0) + 1),
				new Map(),
			)
		: undefined;

	for (const [index, cluster] of clusters.entries()) {
		if (
			!isCluster(cluster) ||
			(index > 0 && clusters[index - 1].count < cluster.count)
		)
			return false;
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
			hasClusterKeys(cluster) &&
			typeof cluster.title === "string" &&
			cluster.title.trim().length > 0 &&
			typeof cluster.summary === "string" &&
			cluster.summary.trim().length > 0 &&
			cluster.count === sourceCluster.count &&
			Array.isArray(cluster.source) &&
			cluster.source.length === sourceCluster.source.length &&
			cluster.source.every(
				(source, sourceIndex) => source === sourceCluster.source[sourceIndex],
			)
		);
	});
