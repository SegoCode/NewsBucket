import assert from "node:assert/strict";
import test from "node:test";
import {
	isValidClusters,
	isValidTranslation,
} from "./cluster-validation.js";
import { validClusters, validTranslation } from "./test-fixtures.js";

test("accepts clusters that satisfy the output contract", () => {
	assert.equal(isValidClusters(validClusters), true);
});

test("rejects an empty cluster list", () => {
	assert.equal(isValidClusters([]), false);
});

test("rejects a cluster with inconsistent count", () => {
	assert.equal(isValidClusters([{ ...validClusters[0], count: 2 }]), false);
});

test("rejects a cluster with duplicate outlets", () => {
	assert.equal(
		isValidClusters([
			{
				...validClusters[0],
				source: ["three.com", "three.com", "five.com"],
			},
		]),
		false,
	);
});

test("rejects a cluster without a meaningful title or summary", () => {
	assert.equal(isValidClusters([{ ...validClusters[0], title: " " }]), false);
	assert.equal(isValidClusters([{ ...validClusters[0], summary: "" }]), false);
});

test("rejects unexpected fields and non-integer counts", () => {
	assert.equal(
		isValidClusters([{ ...validClusters[0], explanation: "extra" }]),
		false,
	);
	assert.equal(isValidClusters([{ ...validClusters[0], count: 3.5 }]), false);
});

test("rejects clusters not sorted by descending count", () => {
	assert.equal(isValidClusters([...validClusters].reverse()), false);
});

test("rejects sources that were not sent to the model", () => {
	assert.equal(
		isValidClusters(validClusters, [
			"one.com",
			"two.com",
			"three.com",
			"four.com",
		]),
		false,
	);
});

test("rejects using a source more times than it appeared in the input", () => {
	const clusters = [
		validClusters[0],
		validClusters[1],
		{
			title: "Repeated source",
			summary: "The model reused an input item.",
			source: ["one.com", "six.com"],
			count: 2,
		},
	];
	assert.equal(
		isValidClusters(clusters, [
			...validClusters.flatMap((cluster) => cluster.source),
			"six.com",
		]),
		false,
	);
});

test("accepts a translation preserving source metadata", () => {
	assert.equal(isValidTranslation(validTranslation, validClusters), true);
});

test("rejects a translation with missing or extra clusters", () => {
	assert.equal(
		isValidTranslation(validTranslation.slice(0, 1), validClusters),
		false,
	);
	assert.equal(
		isValidTranslation(
			[...validTranslation, validTranslation[0]],
			validClusters,
		),
		false,
	);
});

test("rejects a translation that changes order or source metadata", () => {
	assert.equal(
		isValidTranslation(
			[validTranslation[1], validTranslation[0]],
			validClusters,
		),
		false,
	);
	assert.equal(
		isValidTranslation(
			validTranslation.map((cluster, index) =>
				index === 0
					? { ...cluster, source: ["other.com", "two.com"] }
					: cluster,
			),
			validClusters,
		),
		false,
	);
});

test("rejects a translation that adds or removes fields", () => {
	assert.equal(
		isValidTranslation(
			validTranslation.map((cluster, index) =>
				index === 0 ? { ...cluster, explanation: "extra" } : cluster,
			),
			validClusters,
		),
		false,
	);
	const [{ summary: _summary, ...withoutSummary }, ...rest] = validTranslation;
	assert.equal(
		isValidTranslation([withoutSummary, ...rest], validClusters),
		false,
	);
});
