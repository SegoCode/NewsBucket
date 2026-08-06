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
	const workflowScripts = [...workflow.matchAll(/run: pnpm(?: run)? (\w+)/g)]
		.map((match) => match[1])
		.filter((script) => script !== "install");

	assert.deepEqual(workflowScripts, [
		"test",
		"feeds",
		"cluster",
		"translate",
		"validate",
	]);
	for (const script of workflowScripts) {
		assert.equal(typeof packageJson.scripts[script], "string");
	}
});

test("pipeline scripts point to existing JavaScript entrypoints", () => {
	for (const script of ["feeds", "cluster", "translate", "validate"]) {
		const [, entrypoint] = packageJson.scripts[script].split(" ");
		assert.equal(fs.existsSync(path.resolve(entrypoint)), true, entrypoint);
	}
	assert.equal(
		packageJson.scripts.pipeline,
		"pnpm run feeds && pnpm run cluster && pnpm run translate && pnpm run validate",
	);
});
