import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validClusters, validTranslation } from "./test-fixtures.js";
import { translateFiles } from "../translate-clusters.js";

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
