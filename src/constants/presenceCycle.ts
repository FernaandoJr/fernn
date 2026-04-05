import type { PresenceStatusData } from "discord.js"
import { ActivityType } from "discord.js"

/** Max length for custom status text per Discord API. */
export const PRESENCE_ACTIVITY_NAME_MAX = 128

export interface PresenceCycleEntry {
	status?: PresenceStatusData
	name: string
	type: ActivityType
	/** Required when `type` is `Streaming`. */
	url?: string
}

/** How often to advance to the next presence (ms). */
export const PRESENCE_CYCLE_INTERVAL_MS = 30_000

export const PRESENCE_CYCLE: ReadonlyArray<PresenceCycleEntry> = [
	{
		name: "Visit our official server!",
		type: ActivityType.Custom,
		status: "idle",
	},
	{
		name: "Grand Theft Auto VI",
		type: ActivityType.Playing,
		url: "https://www.youtube.com/watch?v=Fs98GQnPnFU",
	},
	{ name: "with slash commands", type: ActivityType.Custom },
	{ name: "using moderation commands", type: ActivityType.Custom },
]
