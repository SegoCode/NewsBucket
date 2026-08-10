import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { encode } from "@toon-format/toon";
import { isValidClusters } from "./cluster-validation.js";
import { requestOpenCodeJson } from "./opencode-client.js";

const INPUT_DIR = "rss_output";
const OUTPUT_DIR = "rss_output_cluster";
const MAX_ATTEMPTS = 4;

const PROMPT = fs.readFileSync("prompts/cluster.md", "utf-8");

export const prepareNewsForClustering = ({ items, cutoff }) =>
	items
		.filter((item) => new Date(item.publishedAt).getTime() >= cutoff)
		.map((item) => ({
			title: item.title,
			source: item.source?.name || "?",
		}));

export const clusterFiles = async ({ category } = {}) => {
	const inputFiles = fs
		.readdirSync(INPUT_DIR)
		.filter((file) => file.endsWith(".json"));
	const files = category
		? inputFiles.filter((file) => file === `rss_${category}.json`)
		: inputFiles;
	if (category && files.length === 0)
		throw new Error(`Unknown cluster category: ${category}`);
	const cutoff = Date.now() - 24 * 60 * 60 * 1000;

	console.log(`→ Clustering ${files.length} file(s)...`);

	for (const file of files) {
		const outFile = path.join(
			OUTPUT_DIR,
			`${path.basename(file, ".json")}_clusters_es.json`,
		);
		const data = JSON.parse(
			fs.readFileSync(path.join(INPUT_DIR, file), "utf-8"),
		);
		const news = prepareNewsForClustering({
			items: data.items,
			cutoff,
		});
		console.log(
			`→ ${file}: ${news.length} news (of ${data.items.length} total)`,
		);
		console.log("→ Sent, streaming...");
		if (process.env.GITHUB_ACTIONS) console.log("  Generating...");

		const availableSources = news.map((item) => item.source);
		const clusters = await requestOpenCodeJson({
			context: file,
			maxAttempts: MAX_ATTEMPTS,
			messages: [
				{ role: "system", content: PROMPT },
				{
					role: "user",
					content: `Cluster these news:\n${encode(news)}`,
				},
			],
			validate: (candidate) => isValidClusters(candidate, availableSources),
			onRetry: (attempt, error) => {
				const message = error instanceof Error ? error.message : String(error);
				console.warn(`  ↻ retry ${attempt}/${MAX_ATTEMPTS - 1} (${message})`);
			},
		});

		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
		fs.writeFileSync(outFile, JSON.stringify(clusters, null, 2));
		console.log(
			`✓ ${path.basename(file, ".json")}: ${clusters.length} clusters`,
		);
	}

	console.log("✓ Clustering complete");
};

if (
	process.argv[1] &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
	const [category] = process.argv.slice(2).filter((arg) => arg !== "--");
	await clusterFiles({ category });
}
