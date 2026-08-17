import assert from "node:assert/strict";
import test from "node:test";
import {
	isValidClusters,
	isValidTranslation,
} from "../cluster-validation.js";
import { requestOpenCodeJson } from "../opencode-client.js";
import {
	failingSseResponse,
	sseResponse,
	validClusters,
	validTranslation,
} from "./test-fixtures.js";

const request = (fetchImpl, validate = () => true, onRetry = () => {}) =>
	requestOpenCodeJson({
		fetchImpl,
		apiKey: "test-key",
		messages: [],
		context: "test/request",
		validate,
		maxAttempts: 4,
		onRetry,
		wait: async () => {},
	});

const requestWithWait = (fetchImpl, validate, wait) =>
	requestOpenCodeJson({
		fetchImpl,
		apiKey: "test-key",
		messages: [],
		context: "test/request",
		validate,
		maxAttempts: 4,
		wait,
	});

test("sends the configured model and API key to OpenCode", async () => {
	let capturedUrl;
	let capturedOptions;

	await request(async (url, options) => {
		capturedUrl = url;
		capturedOptions = options;
		return sseResponse([JSON.stringify(validClusters)]);
	});

	assert.equal(capturedUrl, "https://opencode.ai/zen/v1/chat/completions");
	assert.equal(capturedOptions.headers.Authorization, "Bearer test-key");
	assert.equal(
		JSON.parse(capturedOptions.body).model,
		"nemotron-3-ultra-free",
	);
});

test("retries when fetch throws a terminated body error", async () => {
	let calls = 0;
	const result = await request(async () => {
		calls++;
		if (calls === 1) throw new TypeError("terminated");
		return sseResponse([JSON.stringify(validClusters)]);
	});

	assert.deepEqual(result, validClusters);
	assert.equal(calls, 2);
});

test("retries when the SSE body itself terminates", async () => {
	let calls = 0;
	const result = await request(async () => {
		calls++;
		if (calls === 1) return failingSseResponse();
		return sseResponse([JSON.stringify(validClusters)]);
	});

	assert.deepEqual(result, validClusters);
	assert.equal(calls, 2);
});

test("retries when the response stream terminates before valid JSON", async () => {
	let calls = 0;
	const result = await request(
		async () => {
			calls++;
			if (calls === 1) return sseResponse(['[{"title":"truncated"']);
			return sseResponse([JSON.stringify(validClusters)]);
		},
		(value) => Array.isArray(value) && value.length === 2,
	);

	assert.deepEqual(result, validClusters);
	assert.equal(calls, 2);
});

test("retries an invalid response and accepts a complete second response", async () => {
	let calls = 0;
	const result = await request(
		async () => {
			calls++;
			return sseResponse([calls === 1 ? "[]" : JSON.stringify(validClusters)]);
		},
		(value) => Array.isArray(value) && value.length > 0,
	);

	assert.deepEqual(result, validClusters);
	assert.equal(calls, 2);
});

test("retries a translation with missing clusters", async () => {
	let calls = 0;
	const result = await request(
		async () => {
			calls++;
			return sseResponse([
				JSON.stringify(
					calls === 1 ? validTranslation.slice(0, 1) : validTranslation,
				),
			]);
		},
		(value) => isValidTranslation(value, validClusters),
	);

	assert.deepEqual(result, validTranslation);
	assert.equal(calls, 2);
});

test("retries clusters containing a source not sent to the model", async () => {
	let calls = 0;
	const availableSources = validClusters.flatMap((cluster) => cluster.source);
	const result = await request(
		async () => {
			calls++;
			const clusters =
				calls === 1
					? [
							{
								...validClusters[0],
								source: ["invented.com", "four.com", "five.com"],
							},
							validClusters[1],
						]
					: validClusters;
			return sseResponse([JSON.stringify(clusters)]);
		},
		(value) => isValidClusters(value, availableSources),
	);

	assert.deepEqual(result, validClusters);
	assert.equal(calls, 2);
});

test("fails after the configured attempts without returning invalid data", async () => {
	let calls = 0;

	await assert.rejects(
		request(async () => {
			calls++;
			throw new TypeError("terminated");
		}),
		/failed after 4 attempts: terminated/,
	);

	assert.equal(calls, 4);
});

test("fails after repeated deterministic validation errors", async () => {
	let calls = 0;
	const retries = [];

	await assert.rejects(
		request(
			async () => {
				calls++;
				return sseResponse(["[]"]);
			},
			isValidClusters,
			(attempt) => retries.push(attempt),
		),
		/deterministic validation failed \(possible hallucination\)/,
	);

	assert.equal(calls, 4);
	assert.deepEqual(retries, [1, 2, 3]);
});

test("waits before the final retry", async () => {
	let calls = 0;
	const events = [];
	const result = await requestWithWait(
		async () => {
			calls++;
			return sseResponse([calls === 4 ? JSON.stringify(validClusters) : "[]"]);
		},
		(value) => Array.isArray(value) && value.length > 0,
		(milliseconds) => events.push(`wait ${milliseconds}`),
	);

	assert.deepEqual(result, validClusters);
	assert.equal(calls, 4);
	assert.deepEqual(events, ["wait 60000"]);
});

test("retries HTTP failures", async () => {
	let calls = 0;
	const result = await request(async () => {
		calls++;
		if (calls === 1) return sseResponse("service unavailable", 503);
		return sseResponse([JSON.stringify(validClusters)]);
	});

	assert.deepEqual(result, validClusters);
	assert.equal(calls, 2);
});
