import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { isValidFeedOutput, validateFeedFiles } from "./validate-feeds.js";

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

const withTempDirectories = (callback) => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "newsbucket-feeds-"));
	const inputDir = path.join(root, "input");
	const outputDir = path.join(root, "output");
	fs.mkdirSync(inputDir);
	fs.mkdirSync(outputDir);
	try {
		return callback({ inputDir, outputDir });
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
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

test("validates the configured RSS files on disk", () => {
	withTempDirectories(({ inputDir, outputDir }) => {
		fs.writeFileSync(
			path.join(inputDir, "tech.txt"),
			"https://example.com/rss\n",
		);
		fs.writeFileSync(
			path.join(outputDir, "tech.json"),
			JSON.stringify(validOutput),
		);

		assert.doesNotThrow(() => validateFeedFiles({ inputDir, outputDir }));
	});
});

test("rejects missing, extra and corrupt RSS output files", () => {
	withTempDirectories(({ inputDir, outputDir }) => {
		fs.writeFileSync(
			path.join(inputDir, "tech.txt"),
			"https://example.com/rss\n",
		);

		assert.throws(
			() => validateFeedFiles({ inputDir, outputDir }),
			/RSS output files do not match configured feed files/,
		);

		fs.writeFileSync(path.join(outputDir, "tech.json"), "{}");
		fs.writeFileSync(path.join(outputDir, "extra.json"), "{}");
		assert.throws(
			() => validateFeedFiles({ inputDir, outputDir }),
			/RSS output files do not match configured feed files/,
		);

		fs.rmSync(path.join(outputDir, "extra.json"));
		fs.writeFileSync(path.join(outputDir, "tech.json"), "not-json");
		assert.throws(
			() => validateFeedFiles({ inputDir, outputDir }),
			SyntaxError,
		);
	});
});
