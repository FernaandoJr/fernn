import mongoose, { type Document, Schema } from "mongoose"

/**
 * MongoDB stores only per-server configuration: which channel receives logs and which
 * categories are enabled. Individual log events are not written to the database;
 * they are sent as messages to the configured Discord channel only.
 */
export type ServerLogEventFlags = {
	voice: boolean
	members: boolean
	moderation: boolean
	messages: boolean
}

export type ServerLogSettingsDoc = {
	guildId: string
	channelId: string | null
	enabled: boolean
	events: ServerLogEventFlags
}

type ServerLogSettingsDocument = ServerLogSettingsDoc &
	Document & {
		createdAt?: Date
		updatedAt?: Date
	}

const defaultEvents = (): ServerLogEventFlags => ({
	voice: true,
	members: true,
	moderation: true,
	messages: true,
})

const ServerLogSettingsSchema = new Schema(
	{
		guildId: { type: String, required: true, unique: true, index: true },
		channelId: { type: String, default: null },
		enabled: { type: Boolean, default: false },
		events: {
			voice: { type: Boolean, default: true },
			members: { type: Boolean, default: true },
			moderation: { type: Boolean, default: true },
			messages: { type: Boolean, default: true },
		},
	},
	{ timestamps: true, collection: "serverlogsettings" }
)

export const ServerLogSettingsModel =
	(mongoose.models.ServerLogSettings as
		| mongoose.Model<ServerLogSettingsDocument>
		| undefined) ??
	mongoose.model<ServerLogSettingsDocument>(
		"ServerLogSettings",
		ServerLogSettingsSchema
	)

export function mergeDefaultEvents(
	events: Partial<ServerLogEventFlags> | undefined
): ServerLogEventFlags {
	const d = defaultEvents()
	if (!events) {
		return d
	}
	return {
		voice: events.voice ?? d.voice,
		members: events.members ?? d.members,
		moderation: events.moderation ?? d.moderation,
		messages: events.messages ?? d.messages,
	}
}

export async function getServerLogSettings(
	guildId: string
): Promise<ServerLogSettingsDoc | null> {
	const doc = await ServerLogSettingsModel.findOne({ guildId }).lean().exec()
	if (!doc) {
		return null
	}
	return {
		guildId: doc.guildId,
		channelId: doc.channelId,
		enabled: doc.enabled,
		events: mergeDefaultEvents(doc.events),
	}
}

export async function setServerEventFlags(
	guildId: string,
	events: ServerLogEventFlags
): Promise<void> {
	await ServerLogSettingsModel.findOneAndUpdate(
		{ guildId },
		{ $set: { events, enabled: true } },
		{ upsert: true }
	).exec()
}

export async function setServerLogChannel(
	guildId: string,
	channelId: string
): Promise<ServerLogSettingsDoc> {
	const existing = await getServerLogSettings(guildId)
	const events = existing
		? mergeDefaultEvents(existing.events)
		: defaultEvents()
	const updated = await ServerLogSettingsModel.findOneAndUpdate(
		{ guildId },
		{
			$set: {
				channelId,
				enabled: true,
				events,
			},
		},
		{ new: true, upsert: true, setDefaultsOnInsert: true }
	)
		.lean()
		.exec()

	return {
		guildId: updated!.guildId,
		channelId: updated!.channelId,
		enabled: updated!.enabled,
		events: mergeDefaultEvents(updated!.events),
	}
}

export async function disableServerLogging(guildId: string): Promise<void> {
	await ServerLogSettingsModel.updateOne(
		{ guildId },
		{ $set: { channelId: null, enabled: false } }
	).exec()
}
