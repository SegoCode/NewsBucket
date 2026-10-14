import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { jsonrepair } from "jsonrepair";

const CLI = fileURLToPath(
	import.meta.resolve("@opencode/cli/bin/opencode.exe"),
);
const MODEL = "opencode/nemotron-3.5-lightning-free";
const MAX_ATTEMPTS = 4;
const FINAL_RETRY_DELAY = 60_000;
const CLI_CONFIG = JSON.stringify({
	snapshots: false,
	agents: {
		build: {
			// `run` rejects approval requests without a TTY; never pass --auto.
			permissions: [{ action: "*", resource: "*", effect: "ask" }],
		},
	},
});
const delay = (milliseconds) =>
	new Promise((resolve) => setTimeout(resolve, milliseconds));
const errorText = (error) =>
	error instanceof Error ? error.message : String(error);

const runOpenCode = async (prompt, context) => {
	const directory = await mkdtemp(join(tmpdir(), "newsbucket-opencode-"));
	try {
		return await new Promise((resolve, reject) => {
			const child = execFile(
				CLI,
				[
					"run",
					"--standalone",
					"--format",
					"json",
					"--model",
					MODEL,
					"--agent",
					"build",
					"--title",
					context,
				],
				{
					cwd: directory,
					// Do not inherit API keys, saved accounts, plugins, or project config.
					env: {
						PATH: process.env.PATH,
						SystemRoot: process.env.SystemRoot,
						HOME: directory,
						USERPROFILE: directory,
						TMPDIR: directory,
						TEMP: directory,
						TMP: directory,
						XDG_DATA_HOME: join(directory, "data"),
						XDG_CONFIG_HOME: join(directory, "config"),
						XDG_CACHE_HOME: join(directory, "cache"),
						OPENCODE_CONFIG_DIR: join(directory, "config"),
						OPENCODE_CONFIG_PROJECT_DISABLE: "true",
						OPENCODE_CONFIG_CONTENT: CLI_CONFIG,
					},
					timeout: 300_000,
					maxBuffer: 16 * 1024 * 1024,
				},
				(error, stdout, stderr) => {
					if (error) {
						reject(
							new Error(
								[error.message, stdout, stderr].filter(Boolean).join("\n"),
								{
									cause: error,
								},
							),
						);
					} else resolve(stdout);
				},
			);
			child.stdin?.on("error", (error) => {
				child.kill();
				reject(error);
			});
			// News can exceed argv limits and must never be interpreted by a shell.
			child.stdin?.end(prompt);
		});
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
};

const readCliJson = (stdout) => {
	let content = "";
	for (const line of stdout.split(/\r?\n/)) {
		if (!line.trim()) continue;
		const event = JSON.parse(line);
		if (event.type === "error")
			throw new Error(event.error?.message || JSON.stringify(event.error));
		if (event.type === "text") content += event.part.text;
	}
	return JSON.parse(jsonrepair(content));
};

export const requestOpenCodeJson = async ({
	runImpl = runOpenCode,
	messages,
	validate = () => true,
	context,
	maxAttempts = MAX_ATTEMPTS,
	onRetry = (attempt, error) => {
		console.warn(
			`  ↻ retry ${attempt}/${MAX_ATTEMPTS - 1} (${errorText(error)})`,
		);
	},
	wait = delay,
}) => {
	const prompt = messages.map(({ content }) => content).join("\n\n");
	let lastError;
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			const result = readCliJson(await runImpl(prompt, context));
			if (!validate(result))
				throw new Error(
					`${context}: deterministic validation failed (possible hallucination)`,
				);
			return result;
		} catch (error) {
			lastError = error;
			if (attempt + 1 >= maxAttempts) break;
			const retryNumber = attempt + 1;
			onRetry(retryNumber, error);
			if (retryNumber === 2) await wait(FINAL_RETRY_DELAY);
		}
	}
	throw new Error(
		`${context}: failed after ${maxAttempts} attempts: ${errorText(lastError)}`,
		{ cause: lastError },
	);
};
