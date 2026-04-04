import { fnv1a32 } from "./shipPair.ts"

export const SHIP_VISUAL_BAND_KEYS = [
	"disaster",
	"poor",
	"weak",
	"okay",
	"warm",
	"strong",
	"perfect",
] as const

export type ShipVisualBandKey = (typeof SHIP_VISUAL_BAND_KEYS)[number]

/** Visual-only bands (finer than i18n verdict tiers). Ranges sum to 0–100. */
export function shipVisualBandForPercent(p: number): ShipVisualBandKey {
	if (p <= 14) {
		return "disaster"
	}
	if (p <= 29) {
		return "poor"
	}
	if (p <= 44) {
		return "weak"
	}
	if (p <= 59) {
		return "okay"
	}
	if (p <= 74) {
		return "warm"
	}
	if (p <= 89) {
		return "strong"
	}
	return "perfect"
}

/** Same pair + band always picks the same asset index (independent of verdict text index). */
export function shipVisualAssetIndex(
	pairKey: string,
	band: ShipVisualBandKey,
	length: number,
): number {
	if (length <= 0) {
		return 0
	}
	return fnv1a32(`${pairKey}:visual:${band}`) % length
}
