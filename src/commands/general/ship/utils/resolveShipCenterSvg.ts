import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import manifestData from "../assets/ship-emoji-manifest.json" with { type: "json" }

import {
	shipVisualAssetIndex,
	shipVisualBandForPercent,
	type ShipVisualBandKey,
} from "./shipVisual.ts"

type ShipEmojiManifest = {
	fallback: string
	bands: Partial<Record<ShipVisualBandKey, string[]>>
}

const manifest = manifestData as ShipEmojiManifest

const __dirname = dirname(fileURLToPath(import.meta.url))
const assetsDir = join(__dirname, "../assets")

const fileCache = new Map<string, Buffer>()

async function readSvgCached(filename: string): Promise<Buffer> {
	const hit = fileCache.get(filename)
	if (hit) {
		return hit
	}
	const buf = await readFile(join(assetsDir, filename))
	fileCache.set(filename, buf)
	return buf
}

export async function resolveShipCenterSvg(
	pairKey: string,
	percent: number,
): Promise<Buffer> {
	const band = shipVisualBandForPercent(percent)
	const list = manifest.bands[band] ?? []
	let filename: string | undefined

	if (list.length > 0) {
		const idx = shipVisualAssetIndex(pairKey, band, list.length)
		filename = list[idx]
	}

	if (!filename) {
		filename = manifest.fallback
	}

	try {
		return await readSvgCached(filename)
	} catch {
		return readSvgCached(manifest.fallback)
	}
}
