import { PermissionFlagsBits, type Client } from "discord.js"

import { SERVER_ICON_SCHEDULER_TICK_MS } from "../../constants/serverIcon.ts"
import {
	type ServerIconRotationDoc,
	findEnabledServerIconRotations,
	updateServerIconRotationCursor,
} from "../../database/models/ServerIconRotation.ts"
import { r2GetBuffer } from "../../storage/r2Client.ts"

export function startServerIconRotationScheduler(client: Client): () => void {
	const timer = setInterval(() => {
		void runTick(client)
	}, SERVER_ICON_SCHEDULER_TICK_MS)

	return () => {
		clearInterval(timer)
	}
}

async function runTick(client: Client): Promise<void> {
	const docs = await findEnabledServerIconRotations()
	for (const doc of docs) {
		try {
			await processGuildRotation(client, doc)
		} catch (error) {
			console.error("Server icon rotation tick failed:", doc.guildId, error)
		}
	}
}

async function processGuildRotation(
	client: Client,
	doc: ServerIconRotationDoc
): Promise<void> {
	if (doc.images.length === 0) {
		return
	}

	const intervalMs = doc.intervalMinutes * 60 * 1000
	if (doc.lastRotationAt != null) {
		const elapsed = Date.now() - doc.lastRotationAt.getTime()
		if (elapsed < intervalMs) {
			return
		}
	}

	const guild = await client.guilds.fetch(doc.guildId).catch(() => null)
	if (!guild) {
		return
	}

	const me = guild.members.me
	if (!me?.permissions.has(PermissionFlagsBits.ManageGuild)) {
		return
	}

	const n = doc.images.length
	const idx = ((doc.cursor % n) + n) % n
	const entry = doc.images[idx]
	if (!entry) {
		return
	}

	const buffer = await r2GetBuffer(entry.r2Key)
	await guild.setIcon(buffer, "Server icon rotation")

	const nextCursor = (doc.cursor + 1) % n
	await updateServerIconRotationCursor(doc.guildId, nextCursor, new Date())
}
