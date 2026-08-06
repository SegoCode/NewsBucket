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

test("workflow publishes RSS before generating clusters from that exact commit", () => {
	assert.match(workflow, /fetch-rss:/);
	assert.match(workflow, /generate-news:\n {4}needs: fetch-rss/);
	assert.match(workflow, /commit_sha: \$\{\{ steps\.commit\.outputs\.sha \}\}/);
	assert.match(
		workflow,
		/ref: \$\{\{ needs\.fetch-rss\.outputs\.commit_sha \}\}/,
	);
	assert.match(workflow, /git add code\/rss_output\//);
	assert.match(workflow, /git add code\/rss_output_cluster\//);
	assert.doesNotMatch(workflow, /pnpm(?: run)? test/);
});
