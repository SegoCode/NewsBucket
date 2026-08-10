import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENDPOINT =
	"https://www.perplexity.ai/rest/discover/feed?topic=9be812cb-6120-41b7-bc9e-993200db6cfc";
const OUTPUT_FILE = "rss_output/rss_tech.json";
const SOURCE = { name: "perplexity.ai", url: "https://www.perplexity.ai" };

const firstAnswer = (value) => {
	if (value && typeof value === "object") return value.answer || "";
	if (typeof value !== "string") return "";
	try {
		const parsed = JSON.parse(value);
		return typeof parsed.answer === "string" ? parsed.answer : value;
	} catch {
		return value;
	}
};

const itemUrl = (item) =>
	item.url ||
	(item.slug
		? `https://www.perplexity.ai/discover/${encodeURIComponent(item.slug)}`
		: `https://www.perplexity.ai/discover/${encodeURIComponent(item.uuid)}`);

export const parsePerplexityItems = (
	payload,
	now = () => new Date().toISOString(),
) => {
	if (payload?.status !== "success" || !Array.isArray(payload.items)) return [];
	const publishedAt = now();

	return payload.items
		.map((item) => {
			const url = itemUrl(item);
			const content =
				firstAnswer(item.first_answer) ||
				item.description ||
				item.summary ||
				"";
			return {
				id: item.uuid || url,
				title: item.title || item.short_title || "",
				description: item.summary || item.description || content,
				content,
				url,
				publishedAt,
				author: item.author_username || null,
				categories: ["perplexity"],
				source: SOURCE,
			};
		})
		.filter((item) => item.title.trim() && item.content.trim());
};

export const appendPerplexityItems = (output, items, fetchedAt) => {
	const byUrl = new Map(output.items.map((item) => [item.url, item]));
	for (const item of items) byUrl.set(item.url, item);

	const errors = output.errors.filter((error) => error.url !== ENDPOINT);
	const mergedItems = [...byUrl.values()].sort(
		(a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
	);
	return {
		fetchedAt,
		totalItems: mergedItems.length,
		totalErrors: errors.length,
		items: mergedItems,
		errors,
	};
};

const readTechOutput = () => JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));

const writeTechOutput = (output) => {
	fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
};

export const runPerplexity = async ({
	fetchImpl = globalThis.fetch,
	now = () => new Date().toISOString(),
	readOutput = readTechOutput,
	writeOutput = writeTechOutput,
} = {}) => {
	const output = readOutput();
	const fetchedAt = now();
	const response = await fetchImpl(ENDPOINT, {
		headers: { Accept: "application/json" },
	});
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	const items = parsePerplexityItems(await response.json(), now);
	if (items.length === 0) throw new Error("response has no valid items");

	const merged = appendPerplexityItems(output, items, fetchedAt);
	writeOutput(merged);
	console.log(`✓ perplexity: ${items.length} items appended to tech`);
	return merged;
};

if (
	process.argv[1] &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
	await runPerplexity();
}
