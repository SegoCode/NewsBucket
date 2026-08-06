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

export const sseResponse = (payload, status = 200) => {
	const events = Array.isArray(payload)
		? payload
				.map(
					(content) =>
						`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`,
				)
				.concat("data: [DONE]\n\n")
				.join("")
		: payload;
	return new Response(events, {
		status,
		headers: { "Content-Type": "text/event-stream" },
	});
};

export const failingSseResponse = (error = new TypeError("terminated")) =>
	new Response(
		new ReadableStream({
			start(controller) {
				controller.error(error);
			},
		}),
		{
			status: 200,
			headers: { "Content-Type": "text/event-stream" },
		},
	);
