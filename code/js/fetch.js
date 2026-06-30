import fs from "node:fs";
import path from "node:path";
import { convert } from "html-to-text";
import normalizeUrl from "normalize-url";
import RssParser from "rss-parser";

const INPUT_DIR = "rss_input";
const OUTPUT_DIR = "rss_output";

const parser = new RssParser({
	timeout: 10000,
	headers: { "User-Agent": "NewsWired/1.0" },
});

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const sourceName = (url) => {
	const u = new URL(url);
	const host = u.hostname.replace(/^www\./, "");
	const m = u.pathname.match(/^\/r\/([^/]+)/);
	if (m && (host === "old.reddit.com" || host === "reddit.com")) {
		return `/r/${decodeURIComponent(m[1])}`;
	}
	return host;
};

let lastReddit = 0;

const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith(".txt"));

console.log(`→ Fetching ${files.length} source(s)...`);

for (const file of files) {
	const urls = fs
		.readFileSync(path.join(INPUT_DIR, file), "utf-8")
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l && !l.startsWith("#"));

	const results = await Promise.allSettled(
		urls.map(async (url) => {
			if (url.includes("reddit.com")) {
				const wait = 60_000 - (Date.now() - lastReddit);
				if (wait > 0) await delay(wait);
				lastReddit = Date.now();
			}
			const feed = await parser.parseURL(url);
			return feed.items.map((item) => ({
				id: item.guid || item.link || item.title,
				title: item.title,
				description: convert(item.contentSnippet || item.content || ""),
				content: convert(item.content || item.contentSnippet || ""),
				url: normalizeUrl(item.link || ""),
				publishedAt: item.isoDate || new Date().toISOString(),
				author: item.creator || item.author || null,
				categories: item.categories || [],
				source: { name: sourceName(feed.link), url: feed.link },
			}));
		}),
	);

	const seen = new Set();
	const items = results
		.filter((r) => r.status === "fulfilled")
		.flatMap((r) => r.value)
		.filter((item) => !seen.has(item.url) && seen.add(item.url))
		.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

	const errors = results.flatMap((r, i) =>
		r.status === "rejected" ? [{ url: urls[i], error: r.reason.message }] : [],
	);
	const output = {
		fetchedAt: new Date().toISOString(),
		totalItems: items.length,
		totalErrors: errors.length,
		items,
		errors,
	};
	const outFile = path.join(OUTPUT_DIR, `${path.basename(file, ".txt")}.json`);
	fs.mkdirSync(path.dirname(outFile), { recursive: true });
	fs.writeFileSync(outFile, JSON.stringify(output, null, 2));

	console.log(
		`✓ ${path.basename(file, ".txt")}: ${items.length} items, ${errors.length} errors`,
	);
	if (errors.length > 0) console.log("Errors:", errors);
}

console.log("✓ Fetch complete");
process.exit(0);
