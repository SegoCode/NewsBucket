import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { inspect } from "node:util";
import { isValidClusters } from "../cluster-validation.js";
import { requestLlmJson } from "../llm-client.js";
import { LLM_CONNECTORS } from "../llm-connectors.js";
import { validClusters } from "./test-fixtures.js";

const credentials = { OPENROUTER_API_KEY: "openrouter-test-secret" };
const [openrouter] = LLM_CONNECTORS;
const models = ["primary:free", "backup:free", "last:free"];
const connectors = [{ ...openrouter, models }];
const chat = (value, finish = "stop", message = {}) =>
	Response.json({
		choices: [
			{
				finish_reason: finish,
				message: { content: JSON.stringify(value), ...message },
			},
		],
	});
const request = (fetchImpl, options = {}) =>
	requestLlmJson({
		fetchImpl,
		credentials,
		connectors,
		messages: [{ role: "user", content: "Cluster supplied news." }],
		context: "test/request",
		validate: isValidClusters,
		wait: async () => {},
		...options,
	});
const localApi = async (t, handler) => {
	const server = http.createServer(async (req, res) => {
		let body = "";
		for await (const chunk of req) body += chunk;
		handler(JSON.parse(body), res);
	});
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	t.after(
		() =>
			new Promise((resolve) => {
				server.close(resolve);
				server.closeAllConnections();
			}),
	);
	return `http://127.0.0.1:${server.address().port}`;
};

test("uses a free fallback when the primary model is rate limited", async () => {
	const calls = [];
	const result = await request(async (_url, { body }) => {
		const { model } = JSON.parse(body);
		calls.push(model);
		return model === models[0]
			? new Response("quota", { status: 429 })
			: chat(validClusters);
	});
	assert.deepEqual(result, validClusters);
	assert.deepEqual(calls, models.slice(0, 2));
});

test("exhausts one connector before trying the next and skips missing credentials", async () => {
	const calls = [];
	const result = await request(
		async (_url, { body }) => {
			const { model } = JSON.parse(body);
			calls.push(model);
			return model === "spare:free"
				? chat(validClusters)
				: new Response("unavailable", { status: 404 });
		},
		{
			connectors: [
				{ ...openrouter, id: "unconfigured", required: ["MISSING_KEY"] },
				...connectors,
				{ ...openrouter, id: "spare-api", models: ["spare:free"] },
				{ ...openrouter, id: "unused-api", models: ["unused:free"] },
			],
		},
	);
	assert.deepEqual(result, validClusters);
	assert.deepEqual(calls, [...models, "spare:free"]);
});

test("rejects missing credentials without sending any API request", async () => {
	let calls = 0;
	await assert.rejects(
		request(
			async () => {
				calls++;
				return chat(validClusters);
			},
			{ credentials: {} },
		),
		AggregateError,
	);
	assert.equal(calls, 0);
});

test("falls through invalid clusters and token-truncated completions", async () => {
	const calls = [];
	const result = await request(async (_url, { body }) => {
		const { model } = JSON.parse(body);
		calls.push(model);
		if (model === models[0]) return chat([{ ...validClusters[0], count: 1 }]);
		return chat(validClusters, model === models[1] ? "length" : "stop");
	});
	assert.deepEqual(result, validClusters);
	assert.deepEqual(calls, models);
});

test("never treats reasoning text, refusals or tool calls as an answer", async () => {
	let calls = 0;
	const result = await request(async () => {
		calls++;
		if (calls === 1) return chat(validClusters, "stop", { refusal: "Blocked" });
		if (calls === 2)
			return chat(validClusters, "stop", { tool_calls: [{ id: "tool" }] });
		return chat(validClusters, "stop", { reasoning: "Analysis is not JSON" });
	});
	assert.deepEqual(result, validClusters);
	assert.equal(calls, 3);
});

test("accepts a valid empty edition without consuming fallback calls", async () => {
	let calls = 0;
	const result = await request(async () => {
		calls++;
		return chat([]);
	});
	assert.deepEqual(result, []);
	assert.equal(calls, 1);
});

for (const status of [503, 200]) {
	test(`recovers a transient upstream 504 inside HTTP ${status}`, async () => {
		const calls = [];
		const result = await request(async (_url, { body }) => {
			calls.push(JSON.parse(body).model);
			return calls.length === 1
				? Response.json(
						{ error: { message: "Upstream [504] timeout" } },
						{ status },
					)
				: chat(validClusters);
		});
		assert.deepEqual(result, validClusters);
		assert.deepEqual(calls, [models[0], models[0]]);
	});
}

test("does not mask consumer validator bugs as model failures", async () => {
	let calls = 0;
	const failure = new TypeError("Consumer validation bug");
	await assert.rejects(
		request(
			async () => {
				calls++;
				return chat(validClusters);
			},
			{
				validate: () => {
					throw failure;
				},
			},
		),
		(error) => error === failure,
	);
	assert.equal(calls, 1);
});

test("redacts configured connector credentials in final errors and retry logs", async (t) => {
	const warnings = [];
	t.mock.method(console, "warn", (...values) =>
		warnings.push(values.join(" ")),
	);
	let failure;
	try {
		await request(async () =>
			Response.json(
				{ error: { message: credentials.OPENROUTER_API_KEY } },
				{ status: 503 },
			),
		);
	} catch (error) {
		failure = error;
	}
	assert.ok(failure instanceof AggregateError);
	assert.deepEqual(
		failure.errors.map((error) => error.model),
		models,
	);
	assert.equal(
		(inspect(failure, { depth: null }) + warnings.join("\n")).includes(
			credentials.OPENROUTER_API_KEY,
		),
		false,
	);
});

test("aborts stalled response bodies before using the next model", {
	timeout: 5000,
}, async (t) => {
	const calls = [];
	const base = await localApi(t, ({ model }, res) => {
		calls.push(model);
		res.writeHead(200, { "Content-Type": "application/json" });
		if (model === models[0]) {
			res.flushHeaders();
			return;
		}
		res.end(
			JSON.stringify({
				choices: [
					{
						finish_reason: "stop",
						message: { content: JSON.stringify(validClusters) },
					},
				],
			}),
		);
	});
	const result = await request((_url, init) => fetch(base, init), {
		timeoutMs: 250,
	});
	assert.deepEqual(result, validClusters);
	assert.deepEqual(calls, [models[0], models[0], models[1]]);
});

test("never follows redirects carrying API credentials", async (t) => {
	let leakedRequests = 0;
	const target = await localApi(t, (_body, res) => {
		leakedRequests++;
		res.end("unexpected");
	});
	const base = await localApi(t, (_body, res) => {
		res.writeHead(307, { Location: target });
		res.end();
	});
	await assert.rejects(
		request((_url, init) => fetch(base, init)),
		AggregateError,
	);
	assert.equal(leakedRequests, 0);
});

test("refuses a paid provider even if a paid model is accidentally configured", async () => {
	let chargedRequests = 0;
	await assert.rejects(
		request(
			async (_url, { body }) => {
				const { provider } = JSON.parse(body);
				if (1 > (provider?.max_price?.prompt ?? Infinity))
					return new Response("No zero-price provider", { status: 404 });
				chargedRequests++;
				return chat(validClusters);
			},
			{ connectors: [{ ...openrouter, models: ["accidentally-paid/model"] }] },
		),
		AggregateError,
	);
	assert.equal(chargedRequests, 0);
});

for (const [name, response] of [
	["malformed HTTP envelopes", () => new Response("not JSON", { status: 200 })],
	["empty model answers", () => chat(null, "stop", { content: "" })],
]) {
	test(`falls back after ${name}`, async () => {
		const calls = [];
		const result = await request(async (_url, { body }) => {
			const { model } = JSON.parse(body);
			calls.push(model);
			return model === models[0] ? response() : chat(validClusters);
		});
		assert.deepEqual(result, validClusters);
		assert.equal(calls.at(-1), models[1]);
		assert.ok(calls.slice(0, -1).every((model) => model === models[0]));
	});
}
