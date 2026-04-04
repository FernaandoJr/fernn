/** Stable 32-bit FNV-1a — same input always yields same hash. */
export function fnv1a32(input: string): number {
	let h = 0x811c9dc5
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i)
		h = Math.imul(h, 0x01000193) >>> 0
	}
	return h >>> 0
}

/** Lexicographic order so A|B and B|A share the same pair key. */
export function sortedPairKey(id1: string, id2: string): string {
	return id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`
}

/** Same pair always maps to the same 0–100 inclusive score. */
export function shipPercentFromPairKey(pairKey: string): number {
	return fnv1a32(pairKey) % 101
}

export type ShipTierKey = "veryLow" | "low" | "mid" | "high"

export function shipTierForPercent(p: number): ShipTierKey {
	if (p <= 24) {
		return "veryLow"
	}
	if (p <= 49) {
		return "low"
	}
	if (p <= 74) {
		return "mid"
	}
	return "high"
}

/** Picks a deterministic line index for this pair + tier (no RNG). */
export function shipMessageIndex(
	pairKey: string,
	tierKey: ShipTierKey,
	length: number,
): number {
	if (length <= 0) {
		return 0
	}
	return fnv1a32(`${pairKey}:${tierKey}`) % length
}
