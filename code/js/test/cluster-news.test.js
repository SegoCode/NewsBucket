import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { clusterFiles, prepareNewsForClustering } from "../cluster-news.js";

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

test("preserves a failed category and clears expired news without calling the model", async (t) => {
	const root = fs.mkdtempSync(
		path.join(os.tmpdir(), "newsbucket-cluster-test-"),
	);
	t.after(() => fs.rmSync(root, { recursive: true, force: true }));
	const inputDir = path.join(root, "input");
	const outputDir = path.join(root, "output");
	fs.mkdirSync(inputDir);
	fs.mkdirSync(outputDir);
	const article = {
		id: "old",
		title: "An old story",
		url: "https://example.com/old",
		publishedAt: "2020-01-01T00:00:00Z",
		source: { name: "example.com", url: "https://example.com/rss" },
	};
	fs.writeFileSync(
		path.join(inputDir, "old.json"),
		JSON.stringify({ fetchedAt: new Date().toISOString(), items: [article] }),
	);
	fs.writeFileSync(path.join(inputDir, "broken.json"), "{bad JSON");
	const previous = JSON.stringify([{ title: "Last published edition" }]);
	fs.writeFileSync(path.join(outputDir, "broken_clusters_es.json"), previous);
	let calls = 0;
	await assert.rejects(
		clusterFiles({
			inputDir,
			outputDir,
			generate: async () => {
				calls++;
				throw new Error("Should not call the model");
			},
		}),
		AggregateError,
	);
	assert.equal(calls, 0);
	assert.deepEqual(
		JSON.parse(
			fs.readFileSync(path.join(outputDir, "old_clusters_es.json"), "utf8"),
		),
		[],
	);
	assert.equal(
		fs.readFileSync(path.join(outputDir, "broken_clusters_es.json"), "utf8"),
		previous,
	);
});
