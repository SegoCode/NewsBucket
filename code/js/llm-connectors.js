const chatText = (payload) => {
	const choice = payload.choices?.[0];
	if (choice?.finish_reason !== "stop")
		throw new Error(
			`Incomplete completion: ${choice?.finish_reason || "missing choice"}`,
		);
	if (choice.message?.refusal || choice.message?.tool_calls?.length)
		throw new Error(
			"Provider returned a refusal or tool call instead of an answer",
		);
	return choice.message?.content;
};

// Connector order, then model order, defines the fallback policy.
export const LLM_CONNECTORS = [
	{
		id: "openrouter",
		models: [
			"nvidia/nemotron-3.5-super-vl:free",
			"nvidia/nemotron-3-ultra-550b-a55b:free",
			"google/gemma-4-31b-it:free",
			"openrouter/free",
		],
		required: ["OPENROUTER_API_KEY"],
		request(messages, credentials, model) {
			return {
				url: "https://openrouter.ai/api/v1/chat/completions",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${credentials.OPENROUTER_API_KEY.trim()}`,
				},
				body: {
					model,
					messages,
					stream: false,
					max_tokens: 8192,
					provider: {
						max_price: { prompt: 0, completion: 0, request: 0, image: 0 },
					},
				},
			};
		},
		text: chatText,
	},
];
