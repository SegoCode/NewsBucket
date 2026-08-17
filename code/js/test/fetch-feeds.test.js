import assert from "node:assert/strict";
import test from "node:test";
import {
	buildFeedOutput,
	mapFeedItems,
	parseFeedUrls,
	runFetchFeedsCli,
	sourceName,
} from "../fetch-feeds.js";

test("CLI exits successfully after all feeds finish", async () => {
	const calls = [];
	await runFetchFeedsCli({
		fetch: async () => calls.push("fetch complete"),
		exit: (code) => calls.push(`exit ${code}`),
	});
	assert.deepEqual(calls, ["fetch complete", "exit 0"]);
});

test("parses feed URLs ignoring comments and blank lines", () => {
	assert.deepEqual(
		parseFeedUrls("# comment\nhttps://one.com/rss\n\n https://two.com/feed "),
		["https://one.com/rss", "https://two.com/feed"],
	);
});

test("derives domain and Reddit community source names", () => {
	assert.equal(sourceName("https://www.example.com/rss"), "example.com");
	assert.equal(sourceName("https://old.reddit.com/r/gaming/.rss"), "/r/gaming");
});

test("maps feed items with deterministic fallbacks", () => {
	const [item] = mapFeedItems(
		{
			link: "https://www.example.com/rss",
			items: [
				{
					title: "Headline",
					link: "https://example.com/news?id=1&utm_source=rss",
					contentSnippet: "Summary",
				},
			],
		},
		() => "2026-08-06T12:00:00.000Z",
	);

	assert.equal(item.id, "https://example.com/news?id=1&utm_source=rss");
	assert.equal(item.url, "https://example.com/news?id=1");
	assert.equal(item.publishedAt, "2026-08-06T12:00:00.000Z");
	assert.equal(item.source.name, "example.com");
	assert.equal(item.description, "Summary");
});

test("deduplicates and sorts fulfilled feeds while preserving errors", () => {
	const older = {
		title: "older",
		url: "https://example.com/older",
		publishedAt: "2026-08-05T10:00:00.000Z",
	};
	const newer = {
		title: "newer",
		url: "https://example.com/newer",
		publishedAt: "2026-08-06T10:00:00.000Z",
	};
	const output = buildFeedOutput({
		urls: ["https://one.com/rss", "https://broken.com/rss"],
		results: [
			{ status: "fulfilled", value: [older, newer, { ...older }] },
			{ status: "rejected", reason: new Error("timeout") },
		],
		fetchedAt: "2026-08-06T12:00:00.000Z",
	});

	assert.deepEqual(output.items, [newer, older]);
	assert.deepEqual(output.errors, [
		{ url: "https://broken.com/rss", error: "timeout" },
	]);
	assert.equal(output.totalItems, 2);
	assert.equal(output.totalErrors, 1);
});
