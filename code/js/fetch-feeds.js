import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convert } from "html-to-text";
import normalizeUrl from "normalize-url";
import RssParser from "rss-parser";

const INPUT_DIR = "rss_input";
const OUTPUT_DIR = "rss_output";

const parser = new RssParser({
	timeout: 10000,
	headers: {
		"User-Agent":
			"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
	},
});

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const parseFeedUrls = (content) =>
	content
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith("#"));

export const sourceName = (url) => {
	const u = new URL(url);
	const host = u.hostname.replace(/^www\./, "");
	const m = u.pathname.match(/^\/r\/([^/]+)/);
	if (m && (host === "old.reddit.com" || host === "reddit.com")) {
		return `/r/${decodeURIComponent(m[1])}`;
	}
	return host;
};

export const mapFeedItems = (feed, now = () => new Date().toISOString()) =>
	feed.items.map((item) => ({
		id: item.guid || item.link || item.title,
		title: item.title,
		description: convert(item.contentSnippet || item.content || ""),
		content: convert(item.content || item.contentSnippet || ""),
		url: normalizeUrl(item.link || ""),
		publishedAt: item.isoDate || now(),
		author: item.creator || item.author || null,
		categories: item.categories || [],
		source: { name: sourceName(feed.link), url: feed.link },
	}));

export const buildFeedOutput = ({ results, urls, fetchedAt }) => {
	const seen = new Set();
	const items = results
		.filter((result) => result.status === "fulfilled")
		.flatMap((result) => result.value)
		.filter((item) => !seen.has(item.url) && seen.add(item.url))
		.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
	const errors = results.flatMap((result, index) =>
		result.status === "rejected"
			? [{ url: urls[index], error: result.reason.message }]
			: [],
	);
	return {
		fetchedAt,
		totalItems: items.length,
		totalErrors: errors.length,
		items,
		errors,
	};
};

const fetchFeeds = async () => {
	let lastReddit = 0;
	const files = fs
		.readdirSync(INPUT_DIR)
		.filter((file) => file.endsWith(".txt"));

	console.log(`→ Fetching ${files.length} source(s)...`);

	for (const file of files) {
		const urls = parseFeedUrls(
			fs.readFileSync(path.join(INPUT_DIR, file), "utf-8"),
		);
		const results = await Promise.allSettled(
			urls.map(async (url) => {
				if (url.includes("reddit.com")) {
					const wait = 60_000 - (Date.now() - lastReddit);
					if (wait > 0) await delay(wait);
					lastReddit = Date.now();
				}
				const feed = await parser.parseURL(url);
				return mapFeedItems(feed);
			}),
		);

		const output = buildFeedOutput({
			results,
			urls,
			fetchedAt: new Date().toISOString(),
		});
		const outFile = path.join(
			OUTPUT_DIR,
			`${path.basename(file, ".txt")}.json`,
		);
		fs.mkdirSync(path.dirname(outFile), { recursive: true });
		fs.writeFileSync(outFile, JSON.stringify(output, null, 2));

		console.log(
			`✓ ${path.basename(file, ".txt")}: ${output.items.length} items, ${output.errors.length} errors`,
		);
		if (output.errors.length > 0) console.log("Errors:", output.errors);
	}

	console.log("✓ Fetch complete");
};

if (
	process.argv[1] &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
	await fetchFeeds();
}
