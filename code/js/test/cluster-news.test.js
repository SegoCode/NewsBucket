import assert from "node:assert/strict";
import test from "node:test";
import { prepareNewsForClustering } from "../cluster-news.js";

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse("2026-08-06T12:00:00.000Z");
const cutoff = NOW - 24 * HOUR;

test("keeps only RSS news published within the last 24 hours", () => {
	const result = prepareNewsForClustering({
		items: [
			{
				title: "recent",
				publishedAt: new Date(cutoff).toISOString(),
				source: { name: "recent.com" },
			},
			{
				title: "old",
				publishedAt: new Date(cutoff - 1).toISOString(),
				source: { name: "old.com" },
			},
		],
		cutoff,
	});

	assert.deepEqual(result, [{ title: "recent", source: "recent.com" }]);
});

test("uses only current RSS items for clustering", () => {
	const result = prepareNewsForClustering({
		items: [
			{
				title: "current",
				publishedAt: new Date(cutoff).toISOString(),
				source: { name: "source.com" },
			},
		],
		cutoff,
	});

	assert.deepEqual(result, [{ title: "current", source: "source.com" }]);
});
