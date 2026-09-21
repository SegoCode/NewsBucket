import "dotenv/config";
import { randomBytes } from "node:crypto";
import { EventSourceParserStream } from "eventsource-parser/stream";
import { jsonrepair } from "jsonrepair";

const API_URL = "https://opencode.ai/zen/v1/chat/completions";
const MODEL = "nemotron-3-ultra-free";
const USER_AGENT = "opencode/1.18.31";
const MAX_ATTEMPTS = 4;
const FINAL_RETRY_DELAY = 60_000;
const GEMINI_URL =
	"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent";
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const TOOLS = [
	{
		type: "function",
		function: {
			name: "bash",
			description: "This tool is currently unavailable and must not be used.",
			parameters: { type: "object", properties: {} },
		},
	},
	{
		type: "function",
		function: {
			name: "read",
			description: "This tool is currently unavailable and must not be used.",
			parameters: { type: "object", properties: {} },
		},
	},
];
const opencodeId = (prefix) => {
	let tail = "";
	for (const byte of randomBytes(14)) tail += BASE62[byte % 62];
	return `${prefix}_${randomBytes(6).toString("hex")}${tail}`;
};
const delay = (milliseconds) =>
	new Promise((resolve) => setTimeout(resolve, milliseconds));

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

const isRateLimit = (error) =>
	/HTTP 429\b/.test(error instanceof Error ? error.message : String(error));

const geminiPayload = (messages) => {
	const system = [];
	const contents = [];
	for (const message of messages) {
		if (message.role === "system") {
			system.push(message.content);
			continue;
		}
		contents.push({
			role: message.role === "assistant" ? "model" : "user",
			parts: [{ text: message.content }],
		});
	}
	return {
		contents,
		generationConfig: {
			temperature: 0.2,
			responseMimeType: "application/json",
		},
		...(system.length > 0 && {
			systemInstruction: { parts: [{ text: system.join("\n") }] },
		}),
	};
};

const requestGeminiJson = async ({
	fetchImpl,
	apiKey,
	messages,
	validate,
	context,
}) => {
	const response = await fetchImpl(GEMINI_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-goog-api-key": apiKey,
		},
		body: JSON.stringify(geminiPayload(messages)),
	});
	if (!response.ok) {
		throw new Error(
			`${context}: gemini HTTP ${response.status} ${await response.text()}`,
		);
	}

	const payload = await response.json();
	const text = payload.candidates?.[0]?.content?.parts
		?.map((part) => part.text || "")
		.join("");
	const result = JSON.parse(jsonrepair(text || ""));
	if (!validate(result))
		throw new Error(
			`${context}: deterministic validation failed (possible hallucination)`,
		);
	return result;
};

export const requestOpenCodeJson = async ({
	fetchImpl = globalThis.fetch,
	apiKey = process.env.OPENCODE_API_KEY,
	geminiApiKey = process.env.GEMINI_API_KEY,
	messages,
	validate = () => true,
	context,
	maxAttempts = MAX_ATTEMPTS,
	onRetry = (attempt, error) => {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`  ↻ retry ${attempt}/${MAX_ATTEMPTS - 1} (${message})`);
	},
	wait = delay,
}) => {
	let lastError;
	const sessionId = opencodeId("ses");
	const requestId = opencodeId("msg");

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			const response = await fetchImpl(API_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
					"User-Agent": USER_AGENT,
					"x-opencode-session": sessionId,
					"x-opencode-request": requestId,
					"x-opencode-client": "desktop",
					"x-opencode-project": "global",
				},
				body: JSON.stringify({
					model: MODEL,
					messages,
					temperature: 0.2,
					stream: true,
					tools: TOOLS,
					tool_choice: "none",
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
			if (isRateLimit(error) && geminiApiKey) {
				const message =
					error instanceof Error ? error.message : String(error);
				console.warn(`  ↻ fallback gemini (${message})`);
				return requestGeminiJson({
					fetchImpl,
					apiKey: geminiApiKey,
					messages,
					validate,
					context,
				});
			}
			if (attempt + 1 < maxAttempts) {
				const retryNumber = attempt + 1;
				onRetry(retryNumber, error);
				if (retryNumber === 2) await wait(FINAL_RETRY_DELAY);
			}
		}
	}

	const message =
		lastError instanceof Error ? lastError.message : String(lastError);
	throw new Error(
		`${context}: failed after ${maxAttempts} attempts: ${message}`,
		{ cause: lastError },
	);
};
