import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validClusters, validTranslation } from "./test-fixtures.js";
import { translateClusters, translateFiles } from "./translate-clusters.js";

test("translates every requested language before returning results", async () => {
	const generated = [];
	const translations = await translateClusters({
		clusters: validClusters,
		languages: [{ code: "en" }, { code: "jp" }],
		generate: async ({ code }) => {
			generated.push(code);
			return validTranslation.map((cluster) => ({
				...cluster,
				title: `${code}: ${cluster.title}`,
			}));
		},
	});

	assert.deepEqual(generated, ["en", "jp"]);
	assert.equal(translations.length, 2);
});

test("does not return partial results if a later language is invalid", async () => {
	await assert.rejects(
		translateClusters({
			clusters: validClusters,
			languages: [{ code: "en" }, { code: "jp" }],
			generate: async ({ code }) =>
				code === "en" ? validTranslation : validTranslation.slice(0, 1),
		}),
		/expected 2 clusters, got 1/,
	);
});

test("does not call the generator for an invalid Spanish source", async () => {
	let generateCalls = 0;

	await assert.rejects(
		translateClusters({
			clusters: [],
			languages: [{ code: "en" }],
			generate: async () => {
				generateCalls++;
				return validTranslation;
			},
		}),
		/source has no valid clusters/,
	);

	assert.equal(generateCalls, 0);
});

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
			/1 translation\(s\) failed/,
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
