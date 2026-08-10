import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { isValidClusters, isValidTranslation } from "./cluster-validation.js";
import { requestOpenCodeJson } from "./opencode-client.js";

const OUTPUT_DIR = "rss_output_cluster";
const MAX_ATTEMPTS = 4;

const LANGUAGES = [
	{ code: "en", prompt: fs.readFileSync("prompts/translate_en.md", "utf-8") },
	{ code: "jp", prompt: fs.readFileSync("prompts/translate_jp.md", "utf-8") },
];

export const translateClusters = async ({ clusters, languages, generate }) => {
	if (!isValidClusters(clusters))
		throw new Error("source has no valid clusters");

	const translations = [];
	for (const language of languages) {
		const translated = await generate({ ...language, clusters });
		if (!isValidTranslation(translated, clusters)) {
			const count = Array.isArray(translated) ? translated.length : "invalid";
			throw new Error(
				`${language.code}: expected ${clusters.length} clusters, got ${count}`,
			);
		}
		translations.push({ code: language.code, translated });
	}

	return translations;
};

export const translateFiles = async ({
	category,
	language,
	outputDir = OUTPUT_DIR,
	generate = async ({ code, prompt, clusters: sourceClusters, file }) => {
		console.log(`→ ${file} → ${code}`);
		if (process.env.GITHUB_ACTIONS) console.log("  Generating...");
		return requestOpenCodeJson({
			context: `${file}/${code}`,
			maxAttempts: MAX_ATTEMPTS,
			messages: [
				{ role: "system", content: prompt },
				{ role: "user", content: JSON.stringify(sourceClusters) },
			],
			validate: (candidate) => isValidTranslation(candidate, sourceClusters),
			onRetry: (attempt, error) => {
				const message = error instanceof Error ? error.message : String(error);
				console.warn(`  ↻ retry ${attempt}/${MAX_ATTEMPTS - 1} (${message})`);
			},
		});
	},
} = {}) => {
	if (Boolean(category) !== Boolean(language))
		throw new Error("Category and language must be provided together");

	const sourceFiles = fs
		.readdirSync(outputDir)
		.filter((file) => file.endsWith("_clusters_es.json"));
	const files = category
		? sourceFiles.filter((file) => file === `rss_${category}_clusters_es.json`)
		: sourceFiles;
	const languages = language
		? LANGUAGES.filter(({ code }) => code === language)
		: LANGUAGES;
	if (category && files.length === 0)
		throw new Error(`Unknown cluster category: ${category}`);
	if (language && languages.length === 0)
		throw new Error(`Unsupported translation language: ${language}`);

	console.log(
		`→ Translating ${files.length} file(s) × ${languages.length} language(s)...`,
	);
	const errors = [];

	for (const file of files) {
		const clusters = JSON.parse(
			fs.readFileSync(path.join(outputDir, file), "utf-8"),
		);
		for (const target of languages) {
			try {
				const [{ code, translated }] = await translateClusters({
					clusters,
					languages: [target],
					generate: (options) => generate({ ...options, file }),
				});
				const outFile = `${path.basename(file, "_clusters_es.json")}_clusters_${code}.json`;
				fs.writeFileSync(
					path.join(outputDir, outFile),
					JSON.stringify(translated, null, 2),
				);
				console.log(`✓ ${outFile}: ${translated.length} clusters`);
			} catch (error) {
				errors.push(error);
				console.error(
					`✗ ${file} → ${target.code}: ${error instanceof Error ? error.message : error}`,
				);
			}
		}
	}

	if (errors.length > 0)
		throw new AggregateError(errors, `${errors.length} translation(s) failed`);
	console.log("✓ Translation complete");
};

if (
	process.argv[1] &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
	const [category, language] = process.argv
		.slice(2)
		.filter((arg) => arg !== "--");
	await translateFiles({ category, language });
}
