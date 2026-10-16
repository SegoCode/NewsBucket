import { jsonrepair } from "jsonrepair";
import { LLM_CONNECTORS } from "./llm-connectors.js";
import { errorText, isRetryable, retry } from "./retry.js";

const readBody = async (response) => {
	if (!response.body) return "";
	const chunks = [];
	let bytes = 0;
	for await (const chunk of response.body) {
		bytes += chunk.byteLength;
		if (bytes > 16 * 1024 * 1024)
			throw new Error("LLM API response exceeded 16 MiB");
		chunks.push(chunk);
	}
	return Buffer.concat(chunks, bytes).toString("utf8");
};

const apiError = (response, payload) => {
	const detail =
		typeof payload?.error === "string"
			? payload.error
			: payload?.error?.message ||
				payload?.errors?.map((error) => error.message).join("; ") ||
				response.statusText;
	const error = Object.assign(
		new Error(
			`HTTP ${response.status}: ${detail || "API rejected the request"}`,
		),
		{
			status: response.status,
		},
	);
	// Quotas/authentication/model availability should fall through immediately.
	// A successful HTTP stream/envelope can still carry a transient provider error.
	error.retryable =
		response.status !== 429 &&
		isRetryable(response.ok ? new Error(detail || "API error") : error);
	return error;
};

export const requestLlmJson = async ({
	messages,
	validate = () => true,
	context,
	fetchImpl = globalThis.fetch,
	credentials = process.env,
	connectors = LLM_CONNECTORS,
	maxAttempts = 2,
	timeoutMs = 90_000,
	wait,
}) => {
	if (
		!Array.isArray(messages) ||
		!messages.length ||
		messages.some(
			(message) =>
				!message ||
				!["system", "user", "assistant"].includes(message.role) ||
				typeof message.content !== "string" ||
				!message.content.trim(),
		)
	)
		throw new TypeError(
			"LLM messages must contain non-empty text and a supported role",
		);
	if (
		!Number.isInteger(maxAttempts) ||
		maxAttempts < 1 ||
		!Number.isInteger(timeoutMs) ||
		timeoutMs < 1
	)
		throw new RangeError(
			"LLM attempt count and timeout must be positive integers",
		);
	const secrets = connectors
		.flatMap((connector) => connector.required.map((key) => credentials[key]))
		.filter((value) => typeof value === "string" && value.trim())
		.flatMap((value) => [value, value.trim()]);
	const redact = (value) =>
		secrets.reduce(
			(text, secret) => text.split(secret).join("[REDACTED]"),
			String(value),
		);
	const failures = [];
	const failed = (connector, error, model) => {
		// Do not retain raw fetch errors/requests as causes: they may contain credentials.
		const safe = Object.assign(
			new Error(
				`${connector.id}/${model || "configuration"}: ${redact(errorText(error)).slice(0, 1024)}`,
			),
			{
				provider: connector.id,
				model,
				status: error.status ?? error.cause?.status,
			},
		);
		failures.push(safe);
		console.warn(`[${context}] ${safe.message}; trying the next fallback`);
	};
	for (const connector of connectors) {
		const missing = connector.required.filter(
			(key) => typeof credentials[key] !== "string" || !credentials[key].trim(),
		);
		if (missing.length) {
			failed(connector, new Error(`Not configured: ${missing.join(", ")}`));
			continue;
		}
		for (const model of connector.models) {
			let candidate;
			try {
				candidate = await retry(
					async (attempt) => {
						const request = connector.request(messages, credentials, model);
						console.log(
							`[${context}] ${connector.id}/${model} attempt ${attempt}/${maxAttempts}`,
						);
						const response = await fetchImpl(request.url, {
							method: "POST",
							headers: request.headers,
							body: JSON.stringify(request.body),
							signal: AbortSignal.timeout(timeoutMs),
							redirect: "error",
						});
						const body = await readBody(response);
						let payload;
						try {
							payload = JSON.parse(body);
						} catch {
							if (!response.ok) throw apiError(response);
							throw Object.assign(
								new Error("LLM API returned malformed JSON"),
								{
									retryable: true,
								},
							);
						}
						if (!response.ok || payload?.error || payload?.success === false)
							throw apiError(response, payload);
						const text = connector.text(payload);
						if (typeof text !== "string" || !text.trim())
							throw new Error("LLM API returned no answer");
						return JSON.parse(jsonrepair(text));
					},
					{
						context: `${context}/${connector.id}/${model}`,
						maxAttempts,
						wait,
						onRetry: (attempt, error, milliseconds) =>
							console.warn(
								`[${context}] ${connector.id} retry ${attempt}/${maxAttempts - 1} in ${milliseconds}ms: ${redact(errorText(error))}`,
							),
					},
				);
			} catch (error) {
				failed(connector, error, model);
				continue;
			}
			// Validator exceptions are programming errors, not provider failures.
			if (!validate(candidate)) {
				failed(
					connector,
					new Error("Generated JSON failed data integrity validation"),
					model,
				);
				continue;
			}
			return candidate;
		}
	}
	throw new AggregateError(
		failures,
		`${context}: all LLM APIs failed: ${failures.map((error) => error.message).join("; ")}`,
	);
};
