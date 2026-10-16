import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { translateFiles } from "../translate-clusters.js";
import { validClusters, validTranslation } from "./test-fixtures.js";

test("continues translating other languages and categories after one fails", async () => {
	const outputDir = fs.mkdtempSync(
		path.join(os.tmpdir(), "newsbucket-translate-"),
	);
	try {
		for (const category of ["other", "topic"]) {
			fs.writeFileSync(
				path.join(outputDir, `rss_${category}_clusters_es.json`),
				JSON.stringify(validClusters),
			);
		}

		await assert.rejects(
			translateFiles({
				outputDir,
				generate: async ({ code, file }) => {
					if (file.startsWith("rss_topic") && code === "en")
						throw new Error("English unavailable");
					return validTranslation;
				},
			}),
			AggregateError,
		);

		assert.equal(
			fs.existsSync(path.join(outputDir, "rss_topic_clusters_en.json")),
			false,
		);
		assert.equal(
			fs.existsSync(path.join(outputDir, "rss_topic_clusters_jp.json")),
			true,
		);
		assert.equal(
			fs.existsSync(path.join(outputDir, "rss_other_clusters_en.json")),
			true,
		);
		assert.equal(
			fs.existsSync(path.join(outputDir, "rss_other_clusters_jp.json")),
			true,
		);
	} finally {
		fs.rmSync(outputDir, { recursive: true, force: true });
	}
});

test("publishes an empty edition without spending model requests", async (t) => {
	const outputDir = fs.mkdtempSync(
		path.join(os.tmpdir(), "newsbucket-empty-translation-"),
	);
	t.after(() => fs.rmSync(outputDir, { recursive: true, force: true }));
	fs.writeFileSync(path.join(outputDir, "rss_empty_clusters_es.json"), "[]");
	let calls = 0;
	await translateFiles({
		outputDir,
		generate: async () => {
			calls++;
			throw new Error("No model needed");
		},
	});
	assert.equal(calls, 0);
	for (const language of ["en", "jp"])
		assert.deepEqual(
			JSON.parse(
				fs.readFileSync(
					path.join(outputDir, `rss_empty_clusters_${language}.json`),
					"utf8",
				),
			),
			[],
		);
});

test("a corrupt category cannot block the remaining translations", async (t) => {
	const outputDir = fs.mkdtempSync(
		path.join(os.tmpdir(), "newsbucket-corrupt-translation-"),
	);
	t.after(() => fs.rmSync(outputDir, { recursive: true, force: true }));
	fs.writeFileSync(
		path.join(outputDir, "rss_broken_clusters_es.json"),
		"{broken",
	);
	fs.writeFileSync(
		path.join(outputDir, "rss_good_clusters_es.json"),
		JSON.stringify(validClusters),
	);
	await assert.rejects(
		translateFiles({ outputDir, generate: async () => validTranslation }),
		AggregateError,
	);
	assert.deepEqual(
		JSON.parse(
			fs.readFileSync(
				path.join(outputDir, "rss_good_clusters_jp.json"),
				"utf8",
			),
		),
		validTranslation,
	);
});
