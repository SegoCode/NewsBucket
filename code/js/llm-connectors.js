const interactionText = (payload) => {
	if (payload.status !== "completed")
		throw new Error(
			`Incomplete interaction: ${payload.status || "missing status"}`,
		);
	const steps = Array.isArray(payload.steps) ? payload.steps : [];
	if (
		steps.some(
			(step) => step?.type !== "thought" && step?.type !== "model_output",
		)
	)
		throw new Error(
			"Provider returned a tool call or non-text step instead of an answer",
		);
	const parts = steps
		.filter((step) => step?.type === "model_output")
		.flatMap((step) => (Array.isArray(step.content) ? step.content : []));
	if (
		!parts.length ||
		parts.some((part) => part?.type !== "text" || typeof part.text !== "string")
	)
		throw new Error("Provider returned non-text or empty output");
	return parts.map((part) => part.text).join("");
};

const interactionInput = (messages) => {
	const turns = messages.filter((message) => message.role !== "system");
	if (turns.length === 1 && turns[0].role === "user") return turns[0].content;
	return turns.map((message) => ({
		type: message.role === "assistant" ? "model_output" : "user_input",
		content: [{ type: "text", text: message.content }],
	}));
};

// Connector order, then model order, defines the fallback policy.
export const LLM_CONNECTORS = [
	{
		id: "google",
		models: [
			"gemini-4-hydrogen",
			"gemini-3.5-flash-lite",
			"gemini-3.8-flash",
			"gemini-3.1-flash-lite",
		],
		required: ["GEMINI_API_KEY"],
		request(messages, credentials, model) {
			const system = messages
				.filter((message) => message.role === "system")
				.map((message) => message.content.trim())
				.join("\n\n");
			return {
				url: "https://generativelanguage.googleapis.com/v1/interactions",
				headers: {
					"Content-Type": "application/json",
					"x-goog-api-key": credentials.GEMINI_API_KEY.trim(),
				},
				body: {
					model,
					...(system ? { system_instruction: system } : {}),
					input: interactionInput(messages),
					store: false,
					response_format: {
						type: "text",
						mime_type: "application/json",
					},
					generation_config: {
						thinking_level: "low",
						max_output_tokens: 65536,
					},
				},
			};
		},
		text: interactionText,
	},
];
