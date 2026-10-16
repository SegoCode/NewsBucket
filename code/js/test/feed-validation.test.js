import assert from "node:assert/strict";
import test from "node:test";
import { isValidFeedOutput } from "../feed-validation.js";

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

test("rejects an empty category instead of replacing its last usable output", () => {
	assert.equal(
		isValidFeedOutput({ ...validOutput, totalItems: 0, items: [] }),
		false,
	);
});

test("rejects invalid URLs and duplicated news", () => {
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
});

test("diagnostics and additional metadata cannot invalidate usable news", () => {
	assert.equal(
		isValidFeedOutput({
			...validOutput,
			extra: "metadata",
			totalErrors: 5,
			errors: [{ url: "https://broken.com/rss", error: "" }],
		}),
		true,
	);
});
