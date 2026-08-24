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
		"cluster",
		"validate-clusters",
		"translate",
		"validate-clusters",
	]);
	for (const script of workflowScripts) {
		assert.equal(typeof packageJson.scripts[script], "string");
	}
});

test("pipeline scripts point to existing JavaScript entrypoints", () => {
	for (const script of [
		"feeds",
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

test("workflow clusters each category before one resilient translation job", () => {
	assert.doesNotMatch(workflow, /uses: \.\/\.github\/workflows\//);
	const chain = [
		["cluster-tech", "fetch-rss"],
		["cluster-finance", "cluster-tech"],
		["cluster-gaming", "cluster-finance"],
		["cluster-japan", "cluster-gaming"],
		["translate", "cluster-japan"],
	];
	for (const [job, dependency] of chain) {
		assert.match(
			workflow,
			new RegExp(
				`  ${job}:\\n    name: [^\\n]+\\n    needs: ${dependency}\\n    if: \\$\\{\\{ !cancelled\\(\\) \\}\\}\\n`,
			),
		);
	}

	const clusterCheckpoints = [
		...workflow.matchAll(
			/^ {6}OUTPUT_PATH: (code\/rss_output_cluster\/\S+)$/gm,
		),
	].map((match) => match[1]);
	assert.deepEqual(clusterCheckpoints, [
		"code/rss_output_cluster/rss_tech_clusters_es.json",
		"code/rss_output_cluster/rss_finance_clusters_es.json",
		"code/rss_output_cluster/rss_gaming_clusters_es.json",
		"code/rss_output_cluster/rss_japan_clusters_es.json",
	]);
	assert.match(workflow, /git add -- "\$OUTPUT_PATH"/);
	assert.match(workflow, /git pull --rebase origin main/);
	assert.match(workflow, /continue-on-error: true/);
	assert.match(workflow, /run: pnpm run cluster -- "\$CATEGORY"/);
	assert.match(workflow, /run: pnpm run translate\n/);
	assert.doesNotMatch(workflow, /translate-(?:tech|finance|gaming|japan)-/);
	assert.doesNotMatch(workflow, /name: \d+/);
	assert.doesNotMatch(workflow, /Commit checkpoint/);
	assert.match(workflow, /name: Commit\n/);
	assert.match(workflow, /uses: actions\/checkout@v7/);
	assert.match(workflow, /uses: actions\/setup-node@v7/);
	assert.match(workflow, /uses: pnpm\/action-setup@v6/);
	assert.doesNotMatch(workflow, /pnpm(?: run)? test/);
});
