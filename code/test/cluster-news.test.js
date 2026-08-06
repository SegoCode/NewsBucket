import assert from "node:assert/strict";
import test from "node:test";
import { prepareNewsForClustering } from "../js/cluster-news.js";

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
		previousClusters: [],
		cutoff,
	});

	assert.deepEqual(result.news, [{ title: "recent", source: "recent.com" }]);
});

test("carries red clusters using only their real outlets", () => {
	const result = prepareNewsForClustering({
		items: [],
		previousClusters: [
			{
				title: "carried",
				source: ["one.com", "two.com", "NewsBucket-001", "three.com"],
				count: 4,
			},
		],
		cutoff,
	});

	assert.deepEqual(result.news, [
		{ title: "carried", source: "NewsBucket-001" },
		{ title: "carried", source: "NewsBucket-002" },
		{ title: "carried", source: "NewsBucket-003" },
	]);
	assert.equal(result.carryClusters, 1);
	assert.equal(result.carryItems, 3);
});

test("does not carry clusters below the red threshold or marker-only clusters", () => {
	const result = prepareNewsForClustering({
		items: [],
		previousClusters: [
			{
				title: "not red",
				source: ["one.com", "two.com", "three.com"],
				count: 3,
			},
			{
				title: "markers only",
				source: [
					"NewsBucket-001",
					"NewsBucket-002",
					"NewsBucket-003",
					"NewsBucket-004",
				],
				count: 4,
			},
		],
		cutoff,
	});

	assert.deepEqual(result.news, []);
	assert.equal(result.carryClusters, 0);
	assert.equal(result.carryItems, 0);
});

test("preserves main behavior by restarting carry marker numbers per cluster", () => {
	const result = prepareNewsForClustering({
		items: [],
		previousClusters: [
			{
				title: "first",
				source: ["one.com", "two.com", "three.com", "four.com"],
				count: 4,
			},
			{
				title: "second",
				source: ["five.com", "six.com", "seven.com", "eight.com"],
				count: 4,
			},
		],
		cutoff,
	});

	assert.deepEqual(
		result.news.filter((item) => item.source === "NewsBucket-001"),
		[
			{ title: "first", source: "NewsBucket-001" },
			{ title: "second", source: "NewsBucket-001" },
		],
	);
});
