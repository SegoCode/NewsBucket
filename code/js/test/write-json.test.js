import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { writeJson } from "../write-json.js";

test("a failed replacement preserves the published JSON and removes staging files", (t) => {
	const directory = fs.mkdtempSync(
		path.join(os.tmpdir(), "newsbucket-atomic-"),
	);
	t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
	const file = path.join(directory, "edition.json");
	fs.writeFileSync(file, JSON.stringify({ edition: "previous" }));
	t.mock.method(fs, "renameSync", () => {
		throw Object.assign(new Error("Disk unavailable"), { code: "EIO" });
	});
	assert.throws(() => writeJson(file, { edition: "new" }), { code: "EIO" });
	assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), {
		edition: "previous",
	});
	assert.deepEqual(fs.readdirSync(directory), ["edition.json"]);
});

test("serialization failures never truncate an existing edition", (t) => {
	const directory = fs.mkdtempSync(
		path.join(os.tmpdir(), "newsbucket-serialize-"),
	);
	t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
	const file = path.join(directory, "edition.json");
	writeJson(file, { edition: "previous" });
	const circular = {};
	circular.self = circular;
	assert.throws(() => writeJson(file, circular), TypeError);
	assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), {
		edition: "previous",
	});
});
