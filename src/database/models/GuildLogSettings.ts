import mongoose, { type Document, Schema } from "mongoose"

/**
 * MongoDB stores only per-guild configuration: which channel receives logs and which
 * categories are enabled. Individual log events are not written to the database;
 * they are sent as messages to the configured Discord channel only.
 */
export type GuildLogEventFlags = {
	voice: boolean
	members: boolean
	moderation: boolean
	messages: boolean
}

export type GuildLogSettingsDoc = {
	guildId: string
	channelId: string | null
	enabled: boolean
	events: GuildLogEventFlags
}

type GuildLogSettingsDocument = GuildLogSettingsDoc &
	Document & {
		createdAt?: Date
		updatedAt?: Date
	}

const defaultEvents = (): GuildLogEventFlags => ({
	voice: true,
	members: true,
	moderation: true,
	messages: true,
})

const GuildLogSettingsSchema = new Schema(
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
	{ timestamps: true }
)

export const GuildLogSettingsModel =
	(mongoose.models.GuildLogSettings as
		| mongoose.Model<GuildLogSettingsDocument>
		| undefined) ??
	mongoose.model<GuildLogSettingsDocument>(
		"GuildLogSettings",
		GuildLogSettingsSchema
	)

export function mergeDefaultEvents(
	events: Partial<GuildLogEventFlags> | undefined
): GuildLogEventFlags {
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

export async function getGuildLogSettings(
	guildId: string
): Promise<GuildLogSettingsDoc | null> {
	const doc = await GuildLogSettingsModel.findOne({ guildId }).lean().exec()
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

export async function setGuildLogChannel(
	guildId: string,
	channelId: string
): Promise<GuildLogSettingsDoc> {
	const events = defaultEvents()
	const updated = await GuildLogSettingsModel.findOneAndUpdate(
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

export async function disableGuildLogging(guildId: string): Promise<void> {
	await GuildLogSettingsModel.updateOne(
		{ guildId },
		{ $set: { channelId: null, enabled: false } }
	).exec()
}
