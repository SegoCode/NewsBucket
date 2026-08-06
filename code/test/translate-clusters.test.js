import assert from "node:assert/strict";
import test from "node:test";
import { translateClusters } from "../js/translate-clusters.js";
import { validClusters, validTranslation } from "./test-fixtures.js";

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
