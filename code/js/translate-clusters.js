import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	isValidClusters,
	isValidTranslation,
	normalizeClusters,
} from "./cluster-validation.js";
import { requestLlmJson } from "./llm-client.js";
import { errorText } from "./retry.js";
import { writeJson } from "./write-json.js";

const OUTPUT_DIR = "rss_output_cluster";

const LANGUAGES = [
	{ code: "en", prompt: fs.readFileSync("prompts/translate_en.md", "utf-8") },
	{ code: "jp", prompt: fs.readFileSync("prompts/translate_jp.md", "utf-8") },
];

export const translateClusters = async ({ clusters, languages, generate }) => {
	if (!isValidClusters(clusters))
		throw new Error("source has no valid clusters");

	const translations = [];
	for (const language of languages) {
		const translated = clusters.length
			? await generate({ ...language, clusters })
			: [];
		if (!isValidTranslation(translated, clusters)) {
			const count = Array.isArray(translated) ? translated.length : "invalid";
			throw new Error(
				`${language.code}: expected ${clusters.length} clusters, got ${count}`,
			);
		}
		translations.push({
			code: language.code,
			translated: normalizeClusters(translated).map((cluster, index) => ({
				...cluster,
				source: clusters[index].source,
			})),
		});
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
		return requestLlmJson({
			context: `${file}/${code}`,
			messages: [
				{ role: "system", content: prompt },
				{ role: "user", content: JSON.stringify(sourceClusters) },
			],
			validate: (candidate) => isValidTranslation(candidate, sourceClusters),
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
	if (!files.length) throw new Error("No source cluster files found");

	console.log(
		`→ Translating ${files.length} file(s) × ${languages.length} language(s)...`,
	);
	const errors = [];

	for (const file of files) {
		let clusters;
		try {
			clusters = JSON.parse(
				fs.readFileSync(path.join(outputDir, file), "utf-8"),
			);
			if (!isValidClusters(clusters))
				throw new Error("Invalid source clusters");
		} catch (error) {
			errors.push(error);
			console.error(`✗ ${file}: ${errorText(error)}`);
			continue;
		}
		for (const target of languages) {
			try {
				const [{ code, translated }] = await translateClusters({
					clusters,
					languages: [target],
					generate: (options) => generate({ ...options, file }),
				});
				const outFile = `${path.basename(file, "_clusters_es.json")}_clusters_${code}.json`;
				writeJson(path.join(outputDir, outFile), translated);
				console.log(`✓ ${outFile}: ${translated.length} clusters`);
			} catch (error) {
				errors.push(error);
				console.error(`✗ ${file} → ${target.code}: ${errorText(error)}`);
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
