import {
	type Client,
	type EmbedBuilder,
	type GuildTextBasedChannel,
	PermissionFlagsBits,
} from "discord.js"

import {
	type ServerLogEventFlags,
	type ServerLogSettingsDoc,
	getServerLogSettings,
} from "../../database/models/ServerLogSettings.ts"

const warnedGuilds = new Set<string>()

export function clearLogPermissionWarningForGuild(guildId: string): void {
	warnedGuilds.delete(guildId)
}

async function fetchLogTextChannel(
	client: Client,
	guildId: string,
	channelId: string
): Promise<GuildTextBasedChannel | null> {
	const guild =
		client.guilds.cache.get(guildId) ??
		(await client.guilds.fetch(guildId).catch(() => null))
	if (!guild) {
		return null
	}

	const raw = await guild.channels.fetch(channelId).catch(() => null)
	if (!raw?.isTextBased()) {
		return null
	}

	const me = guild.members.me
	if (!me) {
		return null
	}

	const perms = raw.permissionsFor(me)
	if (
		!perms?.has([
			PermissionFlagsBits.ViewChannel,
			PermissionFlagsBits.SendMessages,
			PermissionFlagsBits.EmbedLinks,
		])
	) {
		if (!warnedGuilds.has(guildId)) {
			warnedGuilds.add(guildId)
			console.warn(
				`[server-log] Missing permissions in log channel for guild ${guildId} (${channelId}).`
			)
		}
		return null
	}

	return raw
}

export async function sendServerLogEmbed(
	client: Client,
	guildId: string,
	category: keyof ServerLogEventFlags,
	embed: EmbedBuilder,
	cachedSettings?: ServerLogSettingsDoc | null
): Promise<void> {
	const settings = cachedSettings ?? (await getServerLogSettings(guildId))
	if (!settings?.enabled || !settings.channelId || !settings.events[category]) {
		return
	}
	const channel = await fetchLogTextChannel(
		client,
		guildId,
		settings.channelId
	)
	if (!channel) {
		return
	}
	await channel.send({ embeds: [embed] })
}
