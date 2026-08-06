import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { encode } from "@toon-format/toon";
import { isValidClusters } from "./cluster-validation.js";
import { requestOpenCodeJson } from "./opencode-client.js";

const INPUT_DIR = "rss_output";
const OUTPUT_DIR = "rss_output_cluster";
const RED_MIN = 4;
const CARRY_SOURCE = "NewsBucket-";
const MAX_ATTEMPTS = 4;

const PROMPT = fs.readFileSync("prompts/cluster.md", "utf-8");

export const prepareNewsForClustering = ({
	items,
	previousClusters,
	cutoff,
}) => {
	// Carry degrades by real outlets only: markers never count towards the next run.
	const carry = previousClusters.filter(
		(c) =>
			c?.count >= RED_MIN &&
			Array.isArray(c.source) &&
			c.source.some((source) => !source.startsWith(CARRY_SOURCE)),
	);
	const carryItems = carry.flatMap((c) =>
		c.source
			.filter((source) => !source.startsWith(CARRY_SOURCE))
			.map((_, i) => ({
				title: c.title,
				source: `${CARRY_SOURCE}${String(i + 1).padStart(3, "0")}`,
			})),
	);

	const news = [
		...items
			.filter((i) => new Date(i.publishedAt).getTime() >= cutoff)
			.map((i) => ({ title: i.title, source: i.source?.name || "?" })),
		...carryItems,
	];
	return { news, carryClusters: carry.length, carryItems: carryItems.length };
};

const clusterFiles = async () => {
	const files = fs
		.readdirSync(INPUT_DIR)
		.filter((file) => file.endsWith(".json"));
	const cutoff = Date.now() - 24 * 60 * 60 * 1000;

	console.log(`→ Clustering ${files.length} file(s)...`);

	for (const file of files) {
		const outFile = path.join(
			OUTPUT_DIR,
			`${path.basename(file, ".json")}_clusters_es.json`,
		);
		const previousClusters = fs.existsSync(outFile)
			? JSON.parse(fs.readFileSync(outFile, "utf-8"))
			: [];
		const data = JSON.parse(
			fs.readFileSync(path.join(INPUT_DIR, file), "utf-8"),
		);
		const prepared = prepareNewsForClustering({
			items: data.items,
			previousClusters,
			cutoff,
		});
		console.log(
			`→ ${file}: ${prepared.news.length - prepared.carryItems} news + ${prepared.carryClusters} red carry clusters (${prepared.carryItems} items) (of ${data.items.length} total)`,
		);
		console.log("→ Sent, streaming...");
		if (process.env.GITHUB_ACTIONS) console.log("  Generating...");

		const availableSources = prepared.news.map((item) => item.source);
		const clusters = await requestOpenCodeJson({
			context: file,
			maxAttempts: MAX_ATTEMPTS,
			messages: [
				{ role: "system", content: PROMPT },
				{
					role: "user",
					content: `Cluster these news:\n${encode(prepared.news)}`,
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
	await clusterFiles();
}
