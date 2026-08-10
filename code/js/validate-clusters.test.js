import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validClusters, validTranslation } from "./test-fixtures.js";
import {
	isValidClusterOutput,
	validateClusterFile,
	validateClusterFiles,
} from "./validate-clusters.js";

const withTempOutput = (callback) => {
	const outputDir = fs.mkdtempSync(
		path.join(os.tmpdir(), "newsbucket-clusters-"),
	);
	try {
		return callback(outputDir);
	} finally {
		fs.rmSync(outputDir, { recursive: true, force: true });
	}
};

test("accepts output when every translation matches Spanish", () => {
	assert.equal(
		isValidClusterOutput(validClusters, {
			en: validTranslation,
			jp: validTranslation,
		}),
		true,
	);
});

test("rejects missing or incomplete translated output", () => {
	assert.equal(
		isValidClusterOutput(validClusters, { en: validTranslation }),
		false,
	);
	assert.equal(
		isValidClusterOutput(validClusters, {
			en: validTranslation,
			jp: validTranslation.slice(0, 1),
		}),
		false,
	);
});

test("rejects a cluster output missing a translation file", () => {
	withTempOutput((outputDir) => {
		fs.writeFileSync(
			path.join(outputDir, "topic_clusters_es.json"),
			JSON.stringify(validClusters),
		);

		assert.throws(() => validateClusterFiles({ outputDir }), /error|ENOENT/i);
	});
});

test("validates one Spanish or translated checkpoint", () => {
	withTempOutput((outputDir) => {
		for (const [language, clusters] of [
			["es", validClusters],
			["en", validTranslation],
		]) {
			fs.writeFileSync(
				path.join(outputDir, `rss_topic_clusters_${language}.json`),
				JSON.stringify(clusters),
			);
		}

		assert.doesNotThrow(() =>
			validateClusterFile({ category: "topic", language: "es", outputDir }),
		);
		assert.doesNotThrow(() =>
			validateClusterFile({ category: "topic", language: "en", outputDir }),
		);
	});
});

test("rejects an invalid translated checkpoint", () => {
	withTempOutput((outputDir) => {
		fs.writeFileSync(
			path.join(outputDir, "rss_topic_clusters_es.json"),
			JSON.stringify(validClusters),
		);
		fs.writeFileSync(
			path.join(outputDir, "rss_topic_clusters_en.json"),
			JSON.stringify(validTranslation.slice(0, 1)),
		);

		assert.throws(
			() =>
				validateClusterFile({
					category: "topic",
					language: "en",
					outputDir,
				}),
			/invalid cluster output/,
		);
	});
});
