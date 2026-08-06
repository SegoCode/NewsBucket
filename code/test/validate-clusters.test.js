import assert from "node:assert/strict";
import test from "node:test";
import { isValidClusterOutput } from "../js/validate-clusters.js";
import { validClusters, validTranslation } from "./test-fixtures.js";

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
