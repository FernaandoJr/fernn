import type { User } from "discord.js"
import sharp from "sharp"

import { resolveShipCenterSvg } from "./resolveShipCenterSvg.ts"

/** Output size per column (avatar slots stay full width; center emoji is drawn smaller inside). */
const COL = 256

/** Max edge length for the center SVG inside the middle column (fraction of COL). */
const CENTER_GRAPHIC_SCALE = 0.72
const CENTER_GRAPHIC_MAX = Math.round(COL * CENTER_GRAPHIC_SCALE)
const CENTER_INSET = Math.floor((COL - CENTER_GRAPHIC_MAX) / 2)

const AVATAR_FETCH_SIZE = 512

async function fetchAvatarPng(user: User): Promise<Buffer> {
	const url = user.displayAvatarURL({
		extension: "png",
		size: AVATAR_FETCH_SIZE,
	})
	const res = await fetch(url)
	if (!res.ok) {
		throw new Error(`Avatar fetch failed: ${res.status}`)
	}
	return Buffer.from(await res.arrayBuffer())
}

/** [avatar1][tiered SVG][avatar2] row, transparent background — for Discord attachment + embed image. */
export async function renderShipBanner(
	user1: User,
	user2: User,
	pairKey: string,
	percent: number,
): Promise<Buffer> {
	const [leftRaw, rightRaw, centerSvg] = await Promise.all([
		fetchAvatarPng(user1),
		fetchAvatarPng(user2),
		resolveShipCenterSvg(pairKey, percent),
	])

	const resizeOpts = {
		kernel: sharp.kernel.lanczos3,
	} as const

	const left = await sharp(leftRaw)
		.resize(COL, COL, { ...resizeOpts, fit: "cover" })
		.png()
		.toBuffer()

	const right = await sharp(rightRaw)
		.resize(COL, COL, { ...resizeOpts, fit: "cover" })
		.png()
		.toBuffer()

	const center = await sharp(centerSvg)
		.resize(CENTER_GRAPHIC_MAX, CENTER_GRAPHIC_MAX, {
			...resizeOpts,
			fit: "contain",
			background: { r: 255, g: 255, b: 255, alpha: 0 },
		})
		.png()
		.toBuffer()

	const width = COL * 3

	return sharp({
		create: {
			width,
			height: COL,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		},
	})
		.composite([
			{ input: left, left: 0, top: 0 },
			{
				input: center,
				left: COL + CENTER_INSET,
				top: CENTER_INSET,
			},
			{ input: right, left: COL * 2, top: 0 },
		])
		.png()
		.toBuffer()
}
