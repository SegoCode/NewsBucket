import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const MINIAPP_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const TEST_PAGE = "/test/index.html";
const MIME_TYPES = {
	".css": "text/css",
	".html": "text/html",
	".js": "text/javascript",
	".json": "application/json",
	".png": "image/png",
};

const serve = (request, response) => {
	void (async () => {
		try {
			const requestPath = decodeURIComponent(
				new URL(request.url, "http://localhost").pathname,
			);
			const filePath = path.resolve(MINIAPP_DIR, `.${requestPath}`);
			const relativePath = path.relative(MINIAPP_DIR, filePath);
			if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
				response.writeHead(403);
				response.end();
				return;
			}

			const content = await readFile(filePath);
			response.writeHead(200, {
				"Cache-Control": "no-store",
				"Content-Type":
					MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
			});
			response.end(content);
		} catch {
			response.writeHead(404);
			response.end();
		}
	})();
};

const listen = (server) =>
	new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => resolve(server.address().port));
	});

const close = (server) =>
	new Promise((resolve, reject) => {
		server.close((error) => (error ? reject(error) : resolve()));
	});

const blockExternalScripts = async (route) => route.abort();

const newTestContext = async (browser) => {
	const context = await browser.newContext();
	await context.route("**://telegram.org/**", blockExternalScripts);
	await context.route("**://www.youtube.com/**", blockExternalScripts);
	return context;
};

const readScenes = async (page) =>
	page
		.locator("#harness a")
		.evaluateAll((links) =>
			links.map((link) => new URL(link.href).searchParams.get("s")),
		);

const readChecks = (page) =>
	page
		.locator("#checks")
		.textContent()
		.then((text) => text || "");

const runScene = async (browser, baseUrl, scene) => {
	const context = await newTestContext(browser);
	const page = await context.newPage();

	try {
		await page.goto(`${baseUrl}${TEST_PAGE}?s=${encodeURIComponent(scene)}`, {
			waitUntil: "domcontentloaded",
		});
		await page.waitForFunction(
			() => {
				const checks = document.getElementById("checks")?.textContent || "";
				return checks.trim() && !checks.includes("FAIL unknown");
			},
			{ timeout: 7000 },
		);
		if (scene === "geo-wins") await page.waitForTimeout(250);
		const checks = await readChecks(page);
		const failures = checks
			.split("\n")
			.filter((line) => line.startsWith("FAIL"));
		return { checks, failures };
	} finally {
		await context.close();
	}
};

const run = async () => {
	const server = createServer(serve);
	let browser;
	try {
		const port = await listen(server);
		const baseUrl = `http://127.0.0.1:${port}`;
		browser = await chromium.launch({ headless: true });
		const discoveryContext = await newTestContext(browser);
		const discovery = await discoveryContext.newPage();
		let scenes;
		try {
			await discovery.goto(`${baseUrl}${TEST_PAGE}`, {
				waitUntil: "domcontentloaded",
			});
			scenes = await readScenes(discovery);
		} finally {
			await discoveryContext.close();
		}

		const failedScenes = [];
		for (const scene of scenes) {
			let result;
			try {
				result = await runScene(browser, baseUrl, scene);
			} catch (error) {
				result = {
					checks: `FAIL runner: ${error instanceof Error ? error.message : error}`,
					failures: ["runner"],
				};
			}
			const ok =
				result.failures.length === 0 && result.checks.trim().length > 0;
			console.log(`${ok ? "ok" : "FAIL"}   ${scene}`);
			if (!ok) failedScenes.push({ scene, checks: result.checks });
		}

		console.log(
			`\n${scenes.length - failedScenes.length}/${scenes.length} pass`,
		);
		for (const { scene, checks } of failedScenes) {
			console.log(`\n[${scene}]\n${checks}`);
		}
		if (failedScenes.length) process.exitCode = 1;
	} finally {
		await browser?.close();
		await close(server);
	}
};

await run();
