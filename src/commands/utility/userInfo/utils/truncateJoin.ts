/** Joins strings; if the full list does not fit in `maxLen`, shows a prefix and `more(hiddenCount)`. */
export function truncateJoin(
	parts: string[],
	joiner: string,
	maxLen: number,
	more: (hidden: number) => string
): string {
	if (parts.length === 0) {
		return ""
	}

	let n = parts.length
	while (n > 0) {
		const slice = parts.slice(0, n)
		const base = slice.join(joiner)
		const hidden = parts.length - n
		const text = hidden > 0 ? `${base}${joiner}${more(hidden)}` : base
		if (text.length <= maxLen) {
			return text
		}
		n -= 1
	}

	const first = parts[0]!
	if (first.length > maxLen) {
		return first.slice(0, Math.max(0, maxLen - 1)) + "…"
	}

	return more(parts.length)
}
