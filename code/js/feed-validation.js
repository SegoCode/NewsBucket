const isNonEmptyString = (value) =>
	typeof value === "string" && value.trim().length > 0;

const isDate = (value) =>
	isNonEmptyString(value) && Number.isFinite(new Date(value).getTime());

const isHttpUrl = (value) => {
	if (!isNonEmptyString(value)) return false;
	try {
		return ["http:", "https:"].includes(new URL(value).protocol);
	} catch {
		return false;
	}
};

export const isFeedItem = (item) =>
	item &&
	typeof item === "object" &&
	isNonEmptyString(item.id) &&
	isNonEmptyString(item.title) &&
	isHttpUrl(item.url) &&
	isDate(item.publishedAt) &&
	isNonEmptyString(item.source?.name) &&
	isHttpUrl(item.source?.url);

export const isValidFeedOutput = (output) => {
	if (
		!isDate(output?.fetchedAt) ||
		!Array.isArray(output?.items) ||
		output.items.length === 0 ||
		!output.items.every(isFeedItem)
	)
		return false;
	const urls = output.items.map((item) => item.url);
	return new Set(urls).size === urls.length;
};
