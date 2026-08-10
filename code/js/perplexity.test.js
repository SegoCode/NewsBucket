import assert from "node:assert/strict";
import test from "node:test";
import {
	appendPerplexityItems,
	parsePerplexityItems,
	runPerplexity,
} from "./perplexity.js";

const payload = {
	status: "success",
	items: [
		{
			uuid: "item-1",
			slug: "google-ai-opt-out",
			title: "Google tests global AI opt-out",
			short_title: "AI opt-out",
			summary: "Google is testing a publisher opt-out.",
			description: "A longer description.",
			first_answer: JSON.stringify({ answer: "Full answer." }),
			published_timestamp: "2026-08-10T03:00:16",
		},
	],
};

test("maps Perplexity discovery cards to feed items dated today", () => {
	const [item] = parsePerplexityItems(
		payload,
		() => "2026-08-10T12:00:00.000Z",
	);

	assert.deepEqual(item, {
		id: "item-1",
		title: "Google tests global AI opt-out",
		description: "Google is testing a publisher opt-out.",
		content: "Full answer.",
		url: "https://www.perplexity.ai/discover/google-ai-opt-out",
		publishedAt: "2026-08-10T12:00:00.000Z",
		author: null,
		categories: ["perplexity"],
		source: { name: "perplexity.ai", url: "https://www.perplexity.ai" },
	});
});

test("appends and replaces Perplexity items without duplicates", () => {
	const existing = {
		fetchedAt: "2026-08-09T00:00:00.000Z",
		totalItems: 1,
		totalErrors: 0,
		items: [
			{
				...parsePerplexityItems(payload)[0],
				title: "Old title",
				publishedAt: "2026-08-09T00:00:00.000Z",
			},
		],
		errors: [],
	};

	const result = appendPerplexityItems(
		existing,
		parsePerplexityItems(payload),
		"2026-08-10T04:00:00.000Z",
	);

	assert.equal(result.totalItems, 1);
	assert.equal(result.items[0].title, payload.items[0].title);
	assert.equal(result.fetchedAt, "2026-08-10T04:00:00.000Z");
});

test("does not add the same cards again on repeated runs", () => {
	const items = parsePerplexityItems(payload, () => "2026-08-10T12:00:00.000Z");
	const output = {
		fetchedAt: "2026-08-10T11:00:00.000Z",
		totalItems: 0,
		totalErrors: 0,
		items: [],
		errors: [],
	};

	const once = appendPerplexityItems(output, items, "2026-08-10T12:00:00.000Z");
	const twice = appendPerplexityItems(once, items, "2026-08-10T13:00:00.000Z");

	assert.equal(once.totalItems, 1);
	assert.equal(twice.totalItems, 1);
	assert.equal(twice.items.length, 1);
	assert.equal(twice.items[0].url, items[0].url);
});

test("runs the Perplexity fetch and writes the merged RSS output", async () => {
	const writes = [];
	const existing = {
		fetchedAt: "2026-08-10T11:00:00.000Z",
		totalItems: 0,
		totalErrors: 0,
		items: [],
		errors: [],
	};
	const result = await runPerplexity({
		fetchImpl: async () =>
			new Response(JSON.stringify(payload), { status: 200 }),
		now: () => "2026-08-10T12:00:00.000Z",
		readOutput: () => existing,
		writeOutput: (output) => writes.push(output),
	});

	assert.equal(writes.length, 1);
	assert.equal(result.totalItems, 1);
	assert.equal(result.items[0].publishedAt, "2026-08-10T12:00:00.000Z");
});

test("fails without writing when Perplexity is unavailable", async () => {
	const writes = [];
	const existing = {
		fetchedAt: "2026-08-10T11:00:00.000Z",
		totalItems: 1,
		totalErrors: 0,
		items: [parsePerplexityItems(payload)[0]],
		errors: [],
	};
	await assert.rejects(
		runPerplexity({
			fetchImpl: async () => new Response("upstream failure", { status: 503 }),
			now: () => "2026-08-10T12:00:00.000Z",
			readOutput: () => existing,
			writeOutput: (output) => writes.push(output),
		}),
		/HTTP 503/,
	);

	assert.equal(writes.length, 0);
});

test("fails without writing when Perplexity returns no valid cards", async () => {
	const writes = [];
	const existing = {
		fetchedAt: "2026-08-10T11:00:00.000Z",
		totalItems: 0,
		totalErrors: 0,
		items: [],
		errors: [],
	};
	await assert.rejects(
		runPerplexity({
			fetchImpl: async () =>
				new Response(JSON.stringify({ status: "success", items: [] }), {
					status: 200,
				}),
			now: () => "2026-08-10T12:00:00.000Z",
			readOutput: () => existing,
			writeOutput: (output) => writes.push(output),
		}),
		/response has no valid items/,
	);

	assert.equal(writes.length, 0);
});

test("uses fallbacks for incomplete Perplexity cards and drops empty cards", () => {
	const items = parsePerplexityItems(
		{
			status: "success",
			items: [
				{
					uuid: "description-only",
					title: "Description fallback",
					description: "Description content",
				},
				{
					uuid: "summary-only",
					short_title: "Short title fallback",
					summary: "Summary content",
				},
				{
					uuid: "answer-object",
					short_title: "Object answer",
					first_answer: { answer: "Object content" },
				},
				{
					uuid: "empty",
					title: "",
				},
			],
		},
		() => "2026-08-10T12:00:00.000Z",
	);

	assert.equal(items.length, 3);
	assert.equal(items[0].content, "Description content");
	assert.equal(items[1].title, "Short title fallback");
	assert.equal(items[1].content, "Summary content");
	assert.equal(items[2].content, "Object content");
	assert.match(items[2].url, /answer-object$/);
});
