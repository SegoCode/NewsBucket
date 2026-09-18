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

const SESSION_ID = /^ses_[0-9a-f]{12}[0-9A-Za-z]{14}$/;
const REQUEST_ID = /^msg_[0-9a-f]{12}[0-9A-Za-z]{14}$/;

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

test("sends zen session headers, stream, and decoy tools", async () => {
	let url;
	let init;
	await request(async (requestUrl, requestInit) => {
		url = requestUrl;
		init = requestInit;
		return sseResponse([JSON.stringify(validClusters)]);
	});

	assert.equal(url, "https://opencode.ai/zen/v1/chat/completions");
	assert.equal(init.headers["User-Agent"], "opencode/1.18.31");
	assert.match(init.headers["x-opencode-session"], SESSION_ID);
	assert.match(init.headers["x-opencode-request"], REQUEST_ID);
	assert.equal(init.headers["x-opencode-client"], "desktop");
	assert.equal(init.headers["x-opencode-project"], "global");

	const body = JSON.parse(init.body);
	assert.equal(body.stream, true);
	assert.equal(body.tool_choice, "none");
	assert.deepEqual(
		body.tools.map((tool) => tool.function.name),
		["bash", "read"],
	);
});

test("reuses session and request ids across retries", async () => {
	const sessions = [];
	const requests = [];
	await request(async (_url, requestInit) => {
		sessions.push(requestInit.headers["x-opencode-session"]);
		requests.push(requestInit.headers["x-opencode-request"]);
		if (sessions.length === 1) throw new TypeError("terminated");
		return sseResponse([JSON.stringify(validClusters)]);
	});

	assert.equal(sessions.length, 2);
	assert.equal(sessions[0], sessions[1]);
	assert.equal(requests[0], requests[1]);
});
