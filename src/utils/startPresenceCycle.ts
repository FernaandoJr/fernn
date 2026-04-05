import type { Client } from "discord.js"
import { ActivityType } from "discord.js"

import {
	type PresenceCycleEntry,
	PRESENCE_ACTIVITY_NAME_MAX,
	PRESENCE_CYCLE,
	PRESENCE_CYCLE_INTERVAL_MS,
} from "../constants/presenceCycle.ts"

function toPresence(entry: PresenceCycleEntry) {
	const name = entry.name.slice(0, PRESENCE_ACTIVITY_NAME_MAX)
	const activity =
		entry.type === ActivityType.Streaming && entry.url
			? { name, type: ActivityType.Streaming, url: entry.url }
			: entry.type === ActivityType.Streaming
				? { name, type: ActivityType.Playing }
				: { name, type: entry.type }

	return {
		status: entry.status ?? "online",
		activities: [activity],
	}
}

/**
 * Applies the first cycle entry on call, then rotates on an interval.
 * Returns a function that clears the interval.
 */
export function startPresenceCycle(client: Client): () => void {
	if (PRESENCE_CYCLE.length === 0) {
		return () => {}
	}

	let index = 0
	const apply = () => {
		const user = client.user
		if (!user) {
			return
		}

		user.setPresence(toPresence(PRESENCE_CYCLE[index]!))
		index = (index + 1) % PRESENCE_CYCLE.length
	}

	apply()

	if (PRESENCE_CYCLE.length === 1) {
		return () => {}
	}

	const timer = setInterval(apply, PRESENCE_CYCLE_INTERVAL_MS)

	return () => {
		clearInterval(timer)
	}
}
