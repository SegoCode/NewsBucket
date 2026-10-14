export const validClusters = [
	{
		title: "Otro titular original",
		summary: "Otro resumen original.",
		source: ["three.com", "four.com", "five.com"],
		count: 3,
	},
	{
		title: "El titular original",
		summary: "El resumen original.",
		source: ["one.com", "two.com"],
		count: 2,
	},
];

export const validTranslation = validClusters.map((cluster) => ({
	...cluster,
	title: `Translated: ${cluster.title}`,
	summary: `Translated: ${cluster.summary}`,
}));
