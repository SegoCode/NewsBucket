import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encode } from "@toon-format/toon";
import { isValidClusters, normalizeClusters } from "./cluster-validation.js";
import { isValidFeedOutput } from "./feed-validation.js";
import { requestLlmJson } from "./llm-client.js";
import { errorText } from "./retry.js";
import { writeJson } from "./write-json.js";

const INPUT_DIR = "rss_output";
const OUTPUT_DIR = "rss_output_cluster";

const PROMPT = fs.readFileSync("prompts/cluster.md", "utf-8");

export const prepareNewsForClustering = ({ items, cutoff }) =>
	items
		.filter((item) => new Date(item.publishedAt).getTime() >= cutoff)
		.map((item) => ({
			title: item.title,
			source: item.source?.name || "?",
		}));

export const clusterFiles = async ({
	category,
	inputDir = INPUT_DIR,
	outputDir = OUTPUT_DIR,
	generate = requestLlmJson,
} = {}) => {
	const inputFiles = fs
		.readdirSync(inputDir)
		.filter((file) => file.endsWith(".json"));
	if (!inputFiles.length) throw new Error("No RSS input files found");
	const files = category
		? inputFiles.filter((file) => file === `rss_${category}.json`)
		: inputFiles;
	if (category && files.length === 0)
		throw new Error(`Unknown cluster category: ${category}`);
	const cutoff = Date.now() - 24 * 60 * 60 * 1000;
	const failures = [];
	console.log(`→ Clustering ${files.length} file(s)...`);

	for (const file of files) {
		try {
			const outFile = path.join(
				outputDir,
				`${path.basename(file, ".json")}_clusters_es.json`,
			);
			const data = JSON.parse(
				fs.readFileSync(path.join(inputDir, file), "utf-8"),
			);
			if (!isValidFeedOutput(data))
				throw new Error(`${file}: invalid RSS input`);
			const news = prepareNewsForClustering({
				items: data.items,
				cutoff,
			});
			console.log(
				`→ ${file}: ${news.length} news (of ${data.items.length} total)`,
			);
			if (news.length) console.log("→ Generating clusters...");
			else console.log("→ No recent news; publishing an empty edition");

			const availableSources = news.map((item) => item.source);
			const clusters = news.length
				? await generate({
						context: file,
						messages: [
							{ role: "system", content: PROMPT },
							{
								role: "user",
								content: `Cluster these news:\n${encode(news)}`,
							},
						],
						validate: (candidate) =>
							isValidClusters(candidate, availableSources),
					})
				: [];

			writeJson(
				outFile,
				normalizeClusters(clusters).sort((a, b) => b.count - a.count),
			);
			console.log(
				`✓ ${path.basename(file, ".json")}: ${clusters.length} clusters`,
			);
		} catch (error) {
			failures.push(error);
			console.error(`✗ ${file}: ${errorText(error)}`);
		}
	}

	if (failures.length)
		throw new AggregateError(
			failures,
			`${failures.length} clustering category(s) failed`,
		);
	console.log("✓ Clustering complete");
};

if (
	process.argv[1] &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
	const [category] = process.argv.slice(2).filter((arg) => arg !== "--");
	await clusterFiles({ category });
}
