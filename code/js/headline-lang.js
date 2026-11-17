const KANA = /[\u3040-\u30ff]/;
const ES_MARK = /[ñÑ¿¡áéíóúÁÉÍÓÚüÜ]/;
const EN_WORD =
	/\b(?:the|a|an|of|to|and|for|in|is|on|with|after|from|as|by|its|are|was|be|at|that|this)\b/gi;
const ES_WORD =
	/\b(?:el|la|los|las|de|del|que|con|para|por|una|un|en|al|se|su)\b/gi;

export const headlineLanguage = (text) => {
	if (typeof text !== "string" || !text.trim()) return null;
	if (KANA.test(text) || (text.match(/[\u4e00-\u9fff]/g) || []).length >= 4)
		return "jp";
	if (ES_MARK.test(text)) return "es";
	const english = text.match(EN_WORD)?.length || 0;
	const spanish = text.match(ES_WORD)?.length || 0;
	if (spanish > english) return "es";
	if (english > spanish) return "en";
	return null;
};

export const matchesLanguage = (text, code) => headlineLanguage(text) === code;

export const fillTitles = async (texts, code, translate) => {
	const titles = texts.slice();
	const pending = [];
	texts.forEach((text, index) => {
		if (!matchesLanguage(text, code)) pending.push(index);
	});
	if (!pending.length) return titles;
	const translated = await translate(pending.map((index) => texts[index]));
	if (!Array.isArray(translated) || translated.length !== pending.length)
		throw new Error(
			`expected ${pending.length} titles, got ${Array.isArray(translated) ? translated.length : "invalid"}`,
		);
	pending.forEach((index, slot) => {
		const title = translated[slot];
		if (typeof title !== "string" || !title.trim())
			throw new Error("empty translated title");
		titles[index] = title.trim();
	});
	return titles;
};

export const referenceTitle = (cluster) =>
	typeof cluster?.original === "string" && cluster.original.trim()
		? cluster.original.trim()
		: cluster.title;
