import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { isValidFeedOutput } from "../feed-validation.js";
import {
	buildFeedOutput,
	fetchFeeds,
	parseFeedUrls,
	sourceName,
} from "../fetch-feeds.js";

test("parses feed URLs ignoring comments and blank lines", () => {
	assert.deepEqual(
		parseFeedUrls("# comment\nhttps://one.com/rss\n\n https://two.com/feed "),
		["https://one.com/rss", "https://two.com/feed"],
	);
});

test("derives domain and Reddit community source names", () => {
	assert.equal(sourceName("https://www.example.com/rss"), "example.com");
	assert.equal(sourceName("https://old.reddit.com/r/gaming/.rss"), "/r/gaming");
	assert.equal(sourceName("https://www.reddit.com/r/stocks/.rss"), "/r/stocks");
});

test("deduplicates and sorts fulfilled feeds while preserving errors", () => {
	const older = {
		title: "older",
		url: "https://example.com/older",
		publishedAt: "2026-08-05T10:00:00.000Z",
	};
	const newer = {
		title: "newer",
		url: "https://example.com/newer",
		publishedAt: "2026-08-06T10:00:00.000Z",
	};
	const output = buildFeedOutput({
		urls: ["https://one.com/rss", "https://broken.com/rss"],
		results: [
			{ status: "fulfilled", value: [older, newer, { ...older }] },
			{ status: "rejected", reason: new Error("timeout") },
		],
		fetchedAt: "2026-08-06T12:00:00.000Z",
	});

	assert.deepEqual(output.items, [newer, older]);
	assert.deepEqual(output.errors, [
		{ url: "https://broken.com/rss", error: "timeout" },
	]);
	assert.equal(output.totalItems, 2);
	assert.equal(output.totalErrors, 1);
});

const fixture = async (t, handler) => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "newsbucket-rss-test-"));
	const inputDir = path.join(root, "input");
	const outputDir = path.join(root, "output");
	fs.mkdirSync(inputDir);
	fs.mkdirSync(outputDir);
	t.after(() => fs.rmSync(root, { recursive: true, force: true }));
	const server = http.createServer(handler);
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	t.after(
		() =>
			new Promise((resolve) => {
				server.close(resolve);
				server.closeAllConnections();
			}),
	);
	return {
		inputDir,
		outputDir,
		base: `http://127.0.0.1:${server.address().port}`,
	};
};

const rss = (link) => `<rss version="2.0"><channel><title>News</title>
<item><title>Usable article</title><link>${link}</link><pubDate>Wed, 14 Oct 2026 12:00:00 GMT</pubDate></item>
<item><title>Article without a link</title></item></channel></rss>`;

test("recovers transient HTTP failures, retains healthy news and does not retry a 404", async (t) => {
	const calls = { flaky: 0, missing: 0 };
	const delays = [];
	const { inputDir, outputDir, base } = await fixture(t, (req, res) => {
		if (req.url === "/flaky") {
			if (++calls.flaky === 1) {
				res.writeHead(503, { "retry-after": "2" });
				res.end();
				return;
			}
			res.end(rss("https://example.com/recovered"));
		} else {
			calls.missing++;
			res.writeHead(404);
			res.end();
		}
	});
	fs.writeFileSync(
		path.join(inputDir, "tech.txt"),
		`${base}/flaky\n${base}/missing`,
	);
	await fetchFeeds({
		inputDir,
		outputDir,
		wait: async (ms) => {
			delays.push(ms);
		},
		onRetry: () => {},
	});
	const output = JSON.parse(
		fs.readFileSync(path.join(outputDir, "tech.json"), "utf8"),
	);
	assert.equal(isValidFeedOutput(output), true);
	assert.deepEqual(
		output.items.map(({ url }) => url),
		["https://example.com/recovered"],
	);
	assert.deepEqual(calls, { flaky: 2, missing: 1 });
	assert.ok(delays[0] >= 2000 && delays[0] <= 60_000);
	assert.equal(output.errors[0].url, `${base}/missing`);
	assert.match(output.errors[0].error, /404/);
});

test("preserves old data on a total outage while completing other categories", async (t) => {
	let failedRequests = 0;
	const { inputDir, outputDir, base } = await fixture(t, (req, res) => {
		if (req.url === "/down") {
			failedRequests++;
			res.writeHead(503);
			res.end();
		} else res.end(rss("https://example.com/healthy"));
	});
	const previous = JSON.stringify({ lastKnownGood: true });
	fs.writeFileSync(path.join(outputDir, "failed.json"), previous);
	fs.writeFileSync(path.join(inputDir, "failed.txt"), `${base}/down`);
	fs.writeFileSync(path.join(inputDir, "healthy.txt"), `${base}/healthy`);
	await assert.rejects(
		fetchFeeds({
			inputDir,
			outputDir,
			wait: async () => {},
			onRetry: () => {},
		}),
		AggregateError,
	);
	assert.equal(failedRequests, 3);
	assert.equal(
		fs.readFileSync(path.join(outputDir, "failed.json"), "utf8"),
		previous,
	);
	assert.equal(
		isValidFeedOutput(
			JSON.parse(fs.readFileSync(path.join(outputDir, "healthy.json"), "utf8")),
		),
		true,
	);
});

test("serializes message-less network failures without losing their cause", () => {
	const output = buildFeedOutput({
		urls: ["https://example.com/rss"],
		results: [
			{
				status: "rejected",
				reason: new AggregateError(
					[Object.assign(new Error(""), { code: "ETIMEDOUT" })],
					"",
				),
			},
		],
		fetchedAt: "2026-10-14T12:00:00.000Z",
	});
	assert.match(output.errors[0].error, /ETIMEDOUT/);
});
