import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import { encode } from "@toon-format/toon";
import { EventSourceParserStream } from "eventsource-parser/stream";
import { jsonrepair } from "jsonrepair";

const API_URL = "https://opencode.ai/zen/v1/chat/completions";
const INPUT_DIR = "rss_output";
const OUTPUT_DIR = "rss_output_cluster";

const PROMPT = fs.readFileSync("prompts/cluster.md", "utf-8");

const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith(".json"));
const cutoff = Date.now() - 24 * 60 * 60 * 1000;

console.log(`→ Clustering ${files.length} file(s)...`);

for (const file of files) {
	const data = JSON.parse(fs.readFileSync(path.join(INPUT_DIR, file), "utf-8"));
	const news = data.items
		.filter((i) => new Date(i.publishedAt).getTime() >= cutoff)
		.map((i) => ({ title: i.title, source: i.source?.name || "?" }));
	console.log(
		`→ ${file}: ${news.length} noticias en las últimas 24h (de ${data.items.length} totales)`,
	);
	console.log("→ Sent, streaming...");
	if (process.env.GITHUB_ACTIONS) console.log("  Generating...");
	let clusters = [];
	for (let attempt = 0; attempt < 2; attempt++) {
		const res = await fetch(API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.OPENCODE_API_KEY}`,
			},
			body: JSON.stringify({
				model: "deepseek-v4-flash-free",
				messages: [
					{ role: "system", content: PROMPT },
					{ role: "user", content: `Cluster these news:\n${encode(news)}` },
				],
				temperature: 0.2,
				stream: true,
			}),
		});
		if (!res.ok)
			throw new Error(`${file}: HTTP ${res.status} ${await res.text()}`);

		const stream = res.body
			.pipeThrough(new TextDecoderStream())
			.pipeThrough(new EventSourceParserStream());
		let content = "";
		let thinking = 0;
		for await (const event of stream) {
			if (event.data === "[DONE]") break;
			const delta = JSON.parse(event.data).choices?.[0]?.delta || {};
			content += delta.content || "";
			thinking += (delta.reasoning_content || "").length;
			if (!process.env.GITHUB_ACTIONS) {
				const phase = content.length
					? `${content.length} chars`
					: `generating ${thinking} chars`;
				process.stdout.write(`\r  ${phase}`);
			}
		}
		if (!process.env.GITHUB_ACTIONS) process.stdout.write("\r\n");
		try {
			clusters = JSON.parse(jsonrepair(content));
		} catch {
			/* empty → retry */
		}
		if (!Array.isArray(clusters))
			throw new Error(`Invalid response for ${file}`);
		const ok =
			clusters.length > 0 &&
			clusters.every(
				(c) => c && Array.isArray(c.source) && c.count === c.source.length,
			);
		if (ok) break;
		const why = clusters.length === 0 ? "empty" : "count mismatch";
		if (!attempt) console.warn(`  ↻ retry 1/1 (${why})`);
	}

	const outFile = path.join(
		OUTPUT_DIR,
		`${path.basename(file, ".json")}_clusters_es.json`,
	);
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	fs.writeFileSync(outFile, JSON.stringify(clusters, null, 2));
	console.log(`✓ ${path.basename(file, ".json")}: ${clusters.length} clusters`);
}

console.log("✓ Clustering complete");
