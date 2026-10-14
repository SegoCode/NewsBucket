import assert from "node:assert/strict";
import test from "node:test";
import { isValidClusters } from "../cluster-validation.js";
import { requestOpenCodeJson } from "../opencode-client.js";
import { validClusters } from "./test-fixtures.js";

const output = (...events) =>
	events.map((event) => JSON.stringify(event)).join("\n");
const text = (value) => ({ type: "text", part: { text: value } });
const request = (runImpl, options = {}) =>
	requestOpenCodeJson({
		runImpl,
		messages: [{ role: "user", content: "Cluster the supplied news." }],
		context: "test/request",
		validate: isValidClusters,
		maxAttempts: 4,
		onRetry: () => {},
		wait: async () => {},
		...options,
	});

test("reads JSON across text events without mixing in reasoning or tool output", async () => {
	const json = JSON.stringify(validClusters);
	const result = await request(async () =>
		output(
			{ type: "step_start", part: {} },
			{ type: "reasoning", part: { text: "This is not the answer." } },
			text(json.slice(0, 17)),
			{ type: "tool_use", part: { state: { output: "Ignore this too." } } },
			text(json.slice(17)),
		),
	);
	assert.deepEqual(result, validClusters);
});

test("retries a failed CLI execution and accepts the next response", async () => {
	let calls = 0;
	const result = await request(async () => {
		calls++;
		if (calls === 1) throw new Error("CLI exited with code 1");
		return output(text(JSON.stringify(validClusters)));
	});
	assert.deepEqual(result, validClusters);
	assert.equal(calls, 2);
});

test("retries data rejected by the consumer validator", async () => {
	let calls = 0;
	const result = await request(async () => {
		calls++;
		return output(text(JSON.stringify(calls === 1 ? [] : validClusters)));
	});
	assert.deepEqual(result, validClusters);
	assert.equal(calls, 2);
});

test("preserves the CLI failure after exhausting the configured attempts", async () => {
	let calls = 0;
	const failure = new Error("CLI exited with code 1");
	await assert.rejects(
		request(async () => {
			calls++;
			throw failure;
		}),
		(error) => error.cause === failure,
	);
	assert.equal(calls, 4);
});

test("rejects an error event even after receiving valid JSON text", async () => {
	await assert.rejects(
		request(
			async () =>
				output(text(JSON.stringify(validClusters)), {
					type: "error",
					error: {
						type: "provider.auth",
						message: "Provider rejected the request",
					},
				}),
			{ maxAttempts: 1 },
		),
		(error) => error.cause.message === "Provider rejected the request",
	);
});

test("does not treat reasoning containing JSON as a completed answer", async () => {
	await assert.rejects(
		request(
			async () =>
				output({
					type: "reasoning",
					part: { text: JSON.stringify(validClusters) },
				}),
			{ maxAttempts: 1 },
		),
	);
});

test("rejects truncated CLI event output rather than repairing the transport", async () => {
	await assert.rejects(
		request(
			async () => `${output(text(JSON.stringify(validClusters)))}\n{"type":`,
			{ maxAttempts: 1 },
		),
		(error) => error.cause instanceof SyntaxError,
	);
});
