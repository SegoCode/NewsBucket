import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convert } from "html-to-text";
import normalizeUrl from "normalize-url";
import RssParser from "rss-parser";
import { isFeedItem, isValidFeedOutput } from "./feed-validation.js";
import { errorText, retry } from "./retry.js";
import { writeJson } from "./write-json.js";

const INPUT_DIR = "rss_input";
const OUTPUT_DIR = "rss_output";
const parser = new RssParser();
const delay = (milliseconds) =>
	new Promise((resolve) => setTimeout(resolve, milliseconds));

export const parseFeedUrls = (content) => [
	...new Set(
		content
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith("#")),
	),
];

export const sourceName = (url) => {
	const u = new URL(url);
	const host = u.hostname.replace(/^www\./, "");
	const m = u.pathname.match(/^\/r\/([^/]+)/);
	if (m && (host === "old.reddit.com" || host === "reddit.com"))
		return `/r/${decodeURIComponent(m[1])}`;
	return host;
};

export const mapFeedItems = (
	feed,
	now = () => new Date().toISOString(),
	url = feed.link,
) =>
	feed.items.flatMap((item) => {
		try {
			const mapped = {
				id: String(item.guid || item.link || item.title || ""),
				title: item.title,
				description: convert(item.contentSnippet || item.content || ""),
				content: convert(item.content || item.contentSnippet || ""),
				url: normalizeUrl(item.link || ""),
				publishedAt: item.isoDate || now(),
				author: item.creator || item.author || null,
				categories: item.categories || [],
				source: { name: sourceName(url), url },
			};
			if (!isFeedItem(mapped))
				throw new Error("Invalid article title, URL, date or source");
			return [mapped];
		} catch (error) {
			console.warn(`[${url}] discarded article: ${errorText(error)}`);
			return [];
		}
	});

export const buildFeedOutput = ({ results, urls, fetchedAt }) => {
	const seen = new Set();
	const items = results
		.filter((result) => result.status === "fulfilled")
		.flatMap((result) => result.value)
		.filter((item) => !seen.has(item.url) && seen.add(item.url))
		.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
	const errors = results.flatMap((result, index) =>
		result.status === "rejected"
			? [{ url: urls[index], error: errorText(result.reason) }]
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

export const fetchFeeds = async ({
	inputDir = INPUT_DIR,
	outputDir = OUTPUT_DIR,
	fetchImpl = globalThis.fetch,
	wait = delay,
	onRetry,
} = {}) => {
	let lastReddit = 0;
	let redditChain = Promise.resolve();
	const download = async (url) => {
		const response = await fetchImpl(url, {
			signal: AbortSignal.timeout(15_000),
			headers: {
				"User-Agent":
					"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
				Accept:
					"application/rss+xml, application/atom+xml, application/xml, text/xml",
			},
		});
		if (!response.ok) {
			const retryAfter = response.headers.get("retry-after");
			await response.body?.cancel();
			throw Object.assign(new Error(`HTTP ${response.status}`), {
				status: response.status,
				retryAfterMs:
					retryAfter && /^\d+$/.test(retryAfter)
						? Number(retryAfter) * 1000
						: Math.max(0, Date.parse(retryAfter) - Date.now()) || 0,
			});
		}
		return mapFeedItems(
			await parser.parseString(await response.text()),
			undefined,
			url,
		);
	};
	const fetchOne = (url) =>
		retry(
			() => {
				const host = new URL(url).hostname;
				if (host !== "reddit.com" && !host.endsWith(".reddit.com"))
					return download(url);
				const next = redditChain.then(async () => {
					const remaining = 60_000 - (Date.now() - lastReddit);
					if (remaining > 0) await wait(remaining);
					lastReddit = Date.now();
					return download(url);
				});
				// The original promise still carries the error to retry/allSettled.
				redditChain = next.catch(() => undefined);
				return next;
			},
			{ context: url, wait, onRetry },
		);
	const files = fs
		.readdirSync(inputDir)
		.filter((file) => file.endsWith(".txt"))
		.sort();
	if (!files.length) throw new Error("No RSS feeds configured");
	const failures = [];
	console.log(`→ Fetching ${files.length} source(s)...`);
	for (const file of files) {
		try {
			const urls = parseFeedUrls(
				fs.readFileSync(path.join(inputDir, file), "utf-8"),
			);
			const results = new Array(urls.length);
			let index = 0;
			await Promise.all(
				Array.from({ length: Math.min(4, urls.length) }, async () => {
					while (index < urls.length) {
						const current = index++;
						try {
							results[current] = {
								status: "fulfilled",
								value: await fetchOne(urls[current]),
							};
						} catch (reason) {
							results[current] = { status: "rejected", reason };
						}
					}
				}),
			);
			const output = buildFeedOutput({
				results,
				urls,
				fetchedAt: new Date().toISOString(),
			});
			if (!isValidFeedOutput(output))
				throw new Error(
					`${file}: no usable articles; ${output.errors.map(({ url, error }) => `${url}: ${error}`).join("; ")}`,
				);
			writeJson(
				path.join(outputDir, `${path.basename(file, ".txt")}.json`),
				output,
			);
			console.log(
				`✓ ${path.basename(file, ".txt")}: ${output.totalItems} items, ${output.totalErrors} errors`,
			);
			if (output.errors.length) console.warn("Errors:", output.errors);
		} catch (error) {
			failures.push(error);
			console.error(`✗ ${file}: ${errorText(error)}`);
		}
	}
	if (failures.length)
		throw new AggregateError(
			failures,
			`${failures.length} RSS category(s) failed; previous output preserved`,
		);
	console.log("✓ Fetch complete");
};

if (
	process.argv[1] &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
)
	await fetchFeeds();
