import assert from "node:assert/strict";
import test from "node:test";
import { isValidOutputSet } from "../js/validate-output.js";
import { validClusters, validTranslation } from "./test-fixtures.js";

test("accepts output when every translation matches Spanish", () => {
	assert.equal(
		isValidOutputSet(validClusters, {
			en: validTranslation,
			jp: validTranslation,
		}),
		true,
	);
});

test("rejects missing or incomplete translated output", () => {
	assert.equal(
		isValidOutputSet(validClusters, { en: validTranslation }),
		false,
	);
	assert.equal(
		isValidOutputSet(validClusters, {
			en: validTranslation,
			jp: validTranslation.slice(0, 1),
		}),
		false,
	);
});
