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

const validateClusterFiles = () => {
	const files = fs
		.readdirSync(OUTPUT_DIR)
		.filter((file) => file.endsWith("_clusters_es.json"));

	for (const file of files) {
		const base = path.basename(file, "_clusters_es.json");
		const spanish = JSON.parse(
			fs.readFileSync(path.join(OUTPUT_DIR, file), "utf-8"),
		);
		const translations = Object.fromEntries(
			TARGET_LANGUAGES.map((language) => [
				language,
				JSON.parse(
					fs.readFileSync(
						path.join(OUTPUT_DIR, `${base}_clusters_${language}.json`),
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
	validateClusterFiles();
}
