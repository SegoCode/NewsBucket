const delay = (milliseconds) =>
	new Promise((resolve) => setTimeout(resolve, milliseconds));

export const errorText = (error) => {
	const message =
		typeof error?.message === "string" ? error.message.trim() : "";
	const code = typeof error?.code === "string" ? error.code : "";
	const causes = error instanceof AggregateError ? error.errors : [];
	return (
		[
			message,
			code,
			...causes.map((cause) => cause?.message || cause?.code || cause?.name),
		]
			.filter(Boolean)
			.join(": ") ||
		error?.cause?.message ||
		error?.cause?.code ||
		error?.name ||
		String(error) ||
		"Unknown error"
	);
};

export const isRetryable = (error) => {
	if (typeof error?.retryable === "boolean") return error.retryable;
	const match = errorText(error).match(
		/(?:HTTP|Status code)\s+(\d{3})\b|\[(\d{3})\]/i,
	);
	const status =
		error?.status >= 400 ? error.status : Number(match?.[1] || match?.[2]);
	if (status) return status === 408 || status === 429 || status >= 500;
	if (error instanceof AggregateError) return error.errors.some(isRetryable);
	if (error?.cause && isRetryable(error.cause)) return true;
	return (
		/^(?:EAI_AGAIN|ECONNRESET|ECONNREFUSED|ECONNABORTED|EPIPE|ENETUNREACH|EHOSTUNREACH|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|UND_ERR_SOCKET)$/.test(
			error?.code,
		) ||
		/timed?\s*out|idle timeout|socket hang up|fetch failed|terminated/i.test(
			errorText(error),
		)
	);
};

export const retry = async (
	operation,
	{
		context,
		maxAttempts = 3,
		wait = delay,
		onRetry = (attempt, error, milliseconds) => {
			console.warn(
				`[${context}] retry ${attempt}/${maxAttempts - 1} in ${milliseconds}ms: ${errorText(error)}`,
			);
		},
	} = {},
) => {
	if (!Number.isInteger(maxAttempts) || maxAttempts < 1)
		throw new RangeError("maxAttempts must be a positive integer");
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await operation(attempt);
		} catch (error) {
			if (attempt === maxAttempts || !isRetryable(error))
				throw new Error(
					`${context}: failed after ${attempt} attempt(s): ${errorText(error)}`,
					{ cause: error },
				);
			const backoff =
				1000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
			const milliseconds = Math.min(
				60_000,
				Math.max(backoff, error.retryAfterMs || 0),
			);
			onRetry(attempt, error, milliseconds);
			await wait(milliseconds);
		}
	}
};
