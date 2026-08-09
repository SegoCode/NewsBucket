import { EventSourceParserStream } from "eventsource-parser/stream";
import { jsonrepair } from "jsonrepair";

const API_URL = "https://opencode.ai/zen/v1/chat/completions";
const MODEL = "deepseek-v4-flash-free";
const MAX_ATTEMPTS = 4;

const readJsonStream = async (response) => {
	if (!response.body) throw new Error("response has no body");

	const stream = response.body
		.pipeThrough(new TextDecoderStream())
		.pipeThrough(new EventSourceParserStream());
	let content = "";

	for await (const event of stream) {
		if (event.data === "[DONE]") break;
		if (!event.data) continue;
		const delta = JSON.parse(event.data).choices?.[0]?.delta || {};
		content += delta.content || "";
	}

	return JSON.parse(jsonrepair(content));
};

export const requestOpenCodeJson = async ({
	fetchImpl = globalThis.fetch,
	apiKey = process.env.OPENCODE_API_KEY,
	messages,
	validate = () => true,
	context,
	maxAttempts = MAX_ATTEMPTS,
	onRetry = () => {},
}) => {
	let lastError;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			const response = await fetchImpl(API_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model: MODEL,
					messages,
					temperature: 0.2,
					stream: true,
				}),
			});
			if (!response.ok) {
				throw new Error(
					`${context}: HTTP ${response.status} ${await response.text()}`,
				);
			}

			const result = await readJsonStream(response);
			if (!validate(result))
				throw new Error(
					`${context}: deterministic validation failed (possible hallucination)`,
				);
			return result;
		} catch (error) {
			lastError = error;
			if (attempt + 1 < maxAttempts) onRetry(attempt + 1, error);
		}
	}

	const message =
		lastError instanceof Error ? lastError.message : String(lastError);
	throw new Error(
		`${context}: failed after ${maxAttempts} attempts: ${message}`,
		{ cause: lastError },
	);
};
