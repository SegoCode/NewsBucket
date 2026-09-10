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
	const workflowScripts = [
		...new Set(
			[...workflow.matchAll(/run: pnpm(?: run)? ([\w-]+)/g)]
				.map((match) => match[1])
				.filter((script) => script !== "install"),
		),
	];

	for (const script of workflowScripts) {
		assert.equal(typeof packageJson.scripts[script], "string", script);
	}
});

test("pipeline scripts point to existing JavaScript entrypoints", () => {
	for (const script of ["feeds", "validate-feeds", "cluster", "translate"]) {
		const [, entrypoint] = packageJson.scripts[script].split(" ");
		assert.equal(fs.existsSync(path.resolve(entrypoint)), true, entrypoint);
	}
});

test("fetch job times out instead of hanging for six hours", () => {
	assert.match(
		workflow,
		/fetch-rss:\n    name: Fetch RSS\n    runs-on: ubuntu-latest\n    timeout-minutes: 10\n/,
	);
	assert.match(
		workflow,
		/name: Fetch RSS feeds\n        timeout-minutes: 8\n        run: pnpm run feeds\n/,
	);
});

test("workflow clusters each category before one resilient translation job", () => {
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

	assert.match(workflow, /git add -- "\$OUTPUT_PATH"/);
	assert.match(workflow, /git pull --rebase origin main/);
	assert.match(workflow, /continue-on-error: true/);
	assert.match(workflow, /run: pnpm run cluster -- "\$CATEGORY"/);
	assert.match(workflow, /run: pnpm run translate\n/);
	assert.doesNotMatch(workflow, /translate-(?:tech|finance|gaming|japan)-/);
	assert.doesNotMatch(workflow, /pnpm(?: run)? test/);
	assert.doesNotMatch(workflow, /pnpm run validate-clusters/);
});
