import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validClusters, validTranslation } from "./test-fixtures.js";
import {
	isValidClusterOutput,
	validateClusterFiles,
} from "../validate-clusters.js";

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

test("requires both English and Japanese translations", () => {
	assert.equal(
		isValidClusterOutput(validClusters, {
			en: validTranslation,
			jp: validTranslation,
		}),
		true,
	);
	assert.equal(
		isValidClusterOutput(validClusters, { en: validTranslation }),
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
