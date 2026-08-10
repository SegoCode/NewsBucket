import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isValidClusters, isValidTranslation } from "./cluster-validation.js";

const OUTPUT_DIR = "rss_output_cluster";
const TARGET_LANGUAGES = ["en", "jp"];

export const isValidClusterOutput = (spanish, translations) =>
	isValidClusters(spanish) &&
	TARGET_LANGUAGES.every((language) =>
		isValidTranslation(translations[language], spanish),
	);

export const validateClusterFile = ({
	category,
	language,
	outputDir = OUTPUT_DIR,
}) => {
	if (!category || !language)
		throw new Error("Category and language are required");
	if (language !== "es" && !TARGET_LANGUAGES.includes(language))
		throw new Error(`Unsupported cluster language: ${language}`);

	const base = `rss_${category}_clusters`;
	const spanish = JSON.parse(
		fs.readFileSync(path.join(outputDir, `${base}_es.json`), "utf-8"),
	);
	const valid =
		language === "es"
			? isValidClusters(spanish)
			: isValidTranslation(
					JSON.parse(
						fs.readFileSync(
							path.join(outputDir, `${base}_${language}.json`),
							"utf-8",
						),
					),
					spanish,
				);
	if (!valid)
		throw new Error(`${category}/${language}: invalid cluster output`);
	console.log(`✓ ${category}/${language}: valid cluster output`);
};

export const validateClusterFiles = ({ outputDir = OUTPUT_DIR } = {}) => {
	const files = fs
		.readdirSync(outputDir)
		.filter((file) => file.endsWith("_clusters_es.json"));

	for (const file of files) {
		const base = path.basename(file, "_clusters_es.json");
		const spanish = JSON.parse(
			fs.readFileSync(path.join(outputDir, file), "utf-8"),
		);
		const translations = Object.fromEntries(
			TARGET_LANGUAGES.map((language) => [
				language,
				JSON.parse(
					fs.readFileSync(
						path.join(outputDir, `${base}_clusters_${language}.json`),
						"utf-8",
					),
				),
			]),
		);

		if (!isValidClusterOutput(spanish, translations))
			throw new Error(
				`${base}: output languages do not match Spanish clusters`,
			);
		console.log(`✓ ${base}: ${spanish.length} clusters × 3 languages`);
	}

	console.log("✓ Cluster validation complete");
};

if (
	process.argv[1] &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
	const [category, language] = process.argv
		.slice(2)
		.filter((arg) => arg !== "--");
	if (category || language) validateClusterFile({ category, language });
	else validateClusterFiles();
}
