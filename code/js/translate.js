import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import { EventSourceParserStream } from "eventsource-parser/stream";

const API_URL = "https://opencode.ai/zen/v1/chat/completions";
const DIR = "rss_output_cluster";

const LANGS = [
	{ code: "en", prompt: fs.readFileSync("prompts/translate_en.md", "utf-8") },
	{ code: "jp", prompt: fs.readFileSync("prompts/translate_jp.md", "utf-8") },
];

const files = fs
	.readdirSync(DIR)
	.filter((f) => f.endsWith("_clusters_es.json"));

console.log(
	`→ Translating ${files.length} file(s) × ${LANGS.length} language(s)...`,
);

for (const file of files) {
	const clusters = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf-8"));
	if (!clusters.length) {
		console.log(`→ ${file}: 0 clusters, skipping`);
		continue;
	}

	for (const { code, prompt } of LANGS) {
		console.log(`→ ${file} → ${code}`);
		if (process.env.GITHUB_ACTIONS) console.log("  Generating...");
		const res = await fetch(API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.OPENCODE_API_KEY}`,
			},
			body: JSON.stringify({
				model: "deepseek-v4-flash-free",
				messages: [
					{ role: "system", content: prompt },
					{ role: "user", content: JSON.stringify(clusters) },
				],
				temperature: 0.2,
				stream: true,
			}),
		});
		if (!res.ok)
			throw new Error(
				`${file}/${code}: HTTP ${res.status} ${await res.text()}`,
			);

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
		content = content.replace(/^```json\s*|\s*```$/g, "").trim() || "[]";
		const translated = JSON.parse(content);
		if (!Array.isArray(translated))
			throw new Error(`Invalid response for ${file}/${code}`);

		const outFile = `${path.basename(file, "_clusters_es.json")}_clusters_${code}.json`;
		fs.writeFileSync(
			path.join(DIR, outFile),
			JSON.stringify(translated, null, 2),
		);
		console.log(`✓ ${outFile}: ${translated.length} clusters`);
	}
}

console.log("✓ Translation complete");
