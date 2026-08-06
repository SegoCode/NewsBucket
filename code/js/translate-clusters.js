import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { isValidClusters, isValidTranslation } from "./cluster-validation.js";
import { requestOpenCodeJson } from "./opencode-client.js";

const OUTPUT_DIR = "rss_output_cluster";
const MAX_ATTEMPTS = 2;

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

const translateFiles = async () => {
	const files = fs
		.readdirSync(OUTPUT_DIR)
		.filter((file) => file.endsWith("_clusters_es.json"));

	console.log(
		`→ Translating ${files.length} file(s) × ${LANGUAGES.length} language(s)...`,
	);

	for (const file of files) {
		const clusters = JSON.parse(
			fs.readFileSync(path.join(OUTPUT_DIR, file), "utf-8"),
		);
		const translations = await translateClusters({
			clusters,
			languages: LANGUAGES,
			generate: async ({ code, prompt, clusters: sourceClusters }) => {
				console.log(`→ ${file} → ${code}`);
				if (process.env.GITHUB_ACTIONS) console.log("  Generating...");
				return requestOpenCodeJson({
					context: `${file}/${code}`,
					maxAttempts: MAX_ATTEMPTS,
					messages: [
						{ role: "system", content: prompt },
						{ role: "user", content: JSON.stringify(sourceClusters) },
					],
					validate: (candidate) =>
						isValidTranslation(candidate, sourceClusters),
					onRetry: (attempt, error) => {
						const message =
							error instanceof Error ? error.message : String(error);
						console.warn(
							`  ↻ retry ${attempt}/${MAX_ATTEMPTS - 1} (${message})`,
						);
					},
				});
			},
		});

		for (const { code, translated } of translations) {
			const outFile = `${path.basename(file, "_clusters_es.json")}_clusters_${code}.json`;
			fs.writeFileSync(
				path.join(OUTPUT_DIR, outFile),
				JSON.stringify(translated, null, 2),
			);
			console.log(`✓ ${outFile}: ${translated.length} clusters`);
		}
	}

	console.log("✓ Translation complete");
};

if (
	process.argv[1] &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
	await translateFiles();
}
