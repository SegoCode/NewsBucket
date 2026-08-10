import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
const workflow = fs.readFileSync(
	"../.github/workflows/update-news.yml",
	"utf-8",
);

test("GitHub Actions only invokes existing pnpm scripts", () => {
	const workflowScripts = [...workflow.matchAll(/run: pnpm(?: run)? ([\w-]+)/g)]
		.map((match) => match[1])
		.filter((script) => script !== "install");

	assert.deepEqual(workflowScripts, [
		"feeds",
		"validate-feeds",
		"perplexity",
		"validate-feeds",
		"cluster",
		"validate-clusters",
		"translate",
	]);
	for (const script of workflowScripts) {
		assert.equal(typeof packageJson.scripts[script], "string");
	}
});

test("pipeline scripts point to existing JavaScript entrypoints", () => {
	for (const script of [
		"feeds",
		"perplexity",
		"validate-feeds",
		"cluster",
		"translate",
		"validate-clusters",
	]) {
		const [, entrypoint] = packageJson.scripts[script].split(" ");
		assert.equal(fs.existsSync(path.resolve(entrypoint)), true, entrypoint);
	}
	assert.equal(
		packageJson.scripts.pipeline,
		"pnpm run feeds && pnpm run validate-feeds && pnpm run cluster && pnpm run translate && pnpm run validate-clusters",
	);
});

test("workflow checkpoints each external call sequentially in one file", () => {
	assert.doesNotMatch(workflow, /uses: \.\/\.github\/workflows\//);
	const chain = [
		["perplexity", "fetch-rss"],
		["cluster-tech", "perplexity"],
		["translate-tech-en", "cluster-tech"],
		["translate-tech-jp", "translate-tech-en"],
		["cluster-finance", "translate-tech-jp"],
		["translate-finance-en", "cluster-finance"],
		["translate-finance-jp", "translate-finance-en"],
		["cluster-gaming", "translate-finance-jp"],
		["translate-gaming-en", "cluster-gaming"],
		["translate-gaming-jp", "translate-gaming-en"],
		["cluster-japan", "translate-gaming-jp"],
		["translate-japan-en", "cluster-japan"],
		["translate-japan-jp", "translate-japan-en"],
		["validate-all", "translate-japan-jp"],
	];
	for (const [job, dependency] of chain) {
		assert.match(
			workflow,
			new RegExp(`  ${job}:\\n    name: [^\\n]+\\n    needs: ${dependency}\\n`),
		);
	}

	const clusterCheckpoints = [
		...workflow.matchAll(
			/^ {6}OUTPUT_PATH: (code\/rss_output_cluster\/\S+)$/gm,
		),
	].map((match) => match[1]);
	assert.deepEqual(clusterCheckpoints, [
		"code/rss_output_cluster/rss_tech_clusters_es.json",
		"code/rss_output_cluster/rss_tech_clusters_en.json",
		"code/rss_output_cluster/rss_tech_clusters_jp.json",
		"code/rss_output_cluster/rss_finance_clusters_es.json",
		"code/rss_output_cluster/rss_finance_clusters_en.json",
		"code/rss_output_cluster/rss_finance_clusters_jp.json",
		"code/rss_output_cluster/rss_gaming_clusters_es.json",
		"code/rss_output_cluster/rss_gaming_clusters_en.json",
		"code/rss_output_cluster/rss_gaming_clusters_jp.json",
		"code/rss_output_cluster/rss_japan_clusters_es.json",
		"code/rss_output_cluster/rss_japan_clusters_en.json",
		"code/rss_output_cluster/rss_japan_clusters_jp.json",
	]);
	assert.match(workflow, /git add -- "\$OUTPUT_PATH"/);
	assert.match(workflow, /git pull --rebase origin main/);
	assert.match(workflow, /run: pnpm run perplexity/);
	assert.match(workflow, /run: pnpm run cluster -- "\$CATEGORY"/);
	assert.match(
		workflow,
		/run: pnpm run translate -- "\$CATEGORY" "\$LANGUAGE"/,
	);
	assert.doesNotMatch(workflow, /pnpm(?: run)? test/);
});
