import assert from "node:assert/strict";
import test from "node:test";
import { isValidFeedOutput } from "../js/validate-feeds.js";

const item = {
	id: "news-1",
	title: "Headline",
	description: "Description",
	content: "Content",
	url: "https://example.com/news-1",
	publishedAt: "2026-08-06T12:00:00.000Z",
	author: null,
	categories: [],
	source: { name: "example.com", url: "https://example.com/rss" },
};

const validOutput = {
	fetchedAt: "2026-08-06T13:00:00.000Z",
	totalItems: 1,
	totalErrors: 1,
	items: [item],
	errors: [{ url: "https://broken.com/rss", error: "timeout" }],
};

test("accepts a consistent non-empty RSS output", () => {
	assert.equal(isValidFeedOutput(validOutput), true);
});

test("rejects empty outputs and inconsistent counters", () => {
	assert.equal(
		isValidFeedOutput({ ...validOutput, totalItems: 0, items: [] }),
		false,
	);
	assert.equal(isValidFeedOutput({ ...validOutput, totalItems: 2 }), false);
	assert.equal(isValidFeedOutput({ ...validOutput, totalErrors: 0 }), false);
});

test("rejects invalid, duplicate or unsorted news", () => {
	assert.equal(
		isValidFeedOutput({
			...validOutput,
			items: [{ ...item, url: "invalid" }],
		}),
		false,
	);
	assert.equal(
		isValidFeedOutput({
			...validOutput,
			totalItems: 2,
			items: [item, { ...item }],
		}),
		false,
	);
	assert.equal(
		isValidFeedOutput({
			...validOutput,
			totalItems: 2,
			items: [
				{ ...item, publishedAt: "2026-08-05T12:00:00.000Z" },
				{
					...item,
					id: "news-2",
					url: "https://example.com/news-2",
				},
			],
		}),
		false,
	);
});
