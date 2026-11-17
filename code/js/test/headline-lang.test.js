import assert from "node:assert/strict";
import test from "node:test";
import { headlineLanguage } from "../headline-lang.js";

test("detects Japanese, Spanish and English headlines", () => {
	assert.equal(
		headlineLanguage("PHP問題で政府が異例の注意喚起　首相X「大至急のお願い」"),
		"jp",
	);
	assert.equal(
		headlineLanguage(
			"【速報中】ドラフト会議 横浜高校 織田翔希投手 巨人が交渉権",
		),
		"jp",
	);
	assert.equal(
		headlineLanguage("El Ibex corrige su optimismo con los resultados"),
		"es",
	);
	assert.equal(
		headlineLanguage(
			'EA is shutting down RPG veteran Bioware "to align talent and investments"',
		),
		"en",
	);
	assert.equal(headlineLanguage("PHP"), null);
});
