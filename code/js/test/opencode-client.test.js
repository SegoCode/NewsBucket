import assert from "node:assert/strict";
import test from "node:test";
import { requestOpenCodeJson } from "../opencode-client.js";
import { sseResponse, validClusters } from "./test-fixtures.js";

const request = (fetchImpl, validate = () => true) =>
	requestOpenCodeJson({
		fetchImpl,
		apiKey: "test-key",
		messages: [],
		context: "test/request",
		validate,
		maxAttempts: 4,
		onRetry: () => {},
		wait: async () => {},
	});

test("retries a transport failure and accepts the next response", async () => {
	let calls = 0;
	const result = await request(async () => {
		calls++;
		if (calls === 1) throw new TypeError("terminated");
		return sseResponse([JSON.stringify(validClusters)]);
	});

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
