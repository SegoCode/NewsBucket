import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const INPUT_DIR = "rss_input";
const OUTPUT_DIR = "rss_output";
const OUTPUT_KEYS = [
	"errors",
	"fetchedAt",
	"items",
	"totalErrors",
	"totalItems",
];
const ITEM_KEYS = [
	"author",
	"categories",
	"content",
	"description",
	"id",
	"publishedAt",
	"source",
	"title",
	"url",
];

const hasKeys = (value, keys) =>
	value &&
	typeof value === "object" &&
	!Array.isArray(value) &&
	Object.keys(value).sort().join(",") === keys.join(",");

const isNonEmptyString = (value) =>
	typeof value === "string" && value.trim().length > 0;

const isDate = (value) =>
	isNonEmptyString(value) && Number.isFinite(new Date(value).getTime());

const isHttpUrl = (value) => {
	if (!isNonEmptyString(value)) return false;
	try {
		return ["http:", "https:"].includes(new URL(value).protocol);
	} catch {
		return false;
	}
};

const isFeedItem = (item) =>
	hasKeys(item, ITEM_KEYS) &&
	isNonEmptyString(item.id) &&
	isNonEmptyString(item.title) &&
	typeof item.description === "string" &&
	typeof item.content === "string" &&
	isHttpUrl(item.url) &&
	isDate(item.publishedAt) &&
	(item.author === null || typeof item.author === "string") &&
	Array.isArray(item.categories) &&
	hasKeys(item.source, ["name", "url"]) &&
	isNonEmptyString(item.source.name) &&
	isHttpUrl(item.source.url);

export const isValidFeedOutput = (output) => {
	if (
		!hasKeys(output, OUTPUT_KEYS) ||
		!isDate(output.fetchedAt) ||
		!Number.isInteger(output.totalItems) ||
		!Number.isInteger(output.totalErrors) ||
		!Array.isArray(output.items) ||
		!Array.isArray(output.errors) ||
		output.totalItems !== output.items.length ||
		output.totalErrors !== output.errors.length ||
		output.items.length === 0 ||
		!output.items.every(isFeedItem)
	)
		return false;

	const urls = output.items.map((item) => item.url);
	if (new Set(urls).size !== urls.length) return false;
	if (
		output.items.some(
			(item, index) =>
				index > 0 &&
				new Date(output.items[index - 1].publishedAt) <
					new Date(item.publishedAt),
		)
	)
		return false;

	return output.errors.every(
		(error) =>
			hasKeys(error, ["error", "url"]) &&
			isHttpUrl(error.url) &&
			isNonEmptyString(error.error),
	);
};

export const validateFeedFiles = ({
	inputDir = INPUT_DIR,
	outputDir = OUTPUT_DIR,
} = {}) => {
	const expectedFiles = fs
		.readdirSync(inputDir)
		.filter((file) => file.endsWith(".txt"))
		.map((file) => `${path.basename(file, ".txt")}.json`)
		.sort();
	const outputFiles = fs
		.readdirSync(outputDir)
		.filter((file) => file.endsWith(".json"))
		.sort();

	if (expectedFiles.join(",") !== outputFiles.join(","))
		throw new Error("RSS output files do not match configured feed files");

	for (const file of expectedFiles) {
		const output = JSON.parse(
			fs.readFileSync(path.join(outputDir, file), "utf-8"),
		);
		if (!isValidFeedOutput(output))
			throw new Error(`${file}: invalid RSS output`);
		console.log(
			`✓ ${file}: ${output.totalItems} items, ${output.totalErrors} errors`,
		);
	}

	console.log("✓ Feed validation complete");
};

if (
	process.argv[1] &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
	validateFeedFiles();
}
