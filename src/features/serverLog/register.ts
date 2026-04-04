import {
	AuditLogEvent,
	type Client,
	Events,
	type GuildAuditLogsEntry,
	type VoiceState,
} from "discord.js"

import { getGuildLogSettings } from "../../database/models/GuildLogSettings.ts"
import { getTranslator } from "../../i18n/index.ts"
import { createDefaultEmbed } from "../../utils/defaultEmbed.ts"
import { sendGuildLogEmbed } from "./logChannel.ts"
import { shouldSkipLeaveDueToRecentModeration } from "./memberLeaveDedupe.ts"

function logLocaleFromVoiceState(state: VoiceState): string | null {
	return state.guild.preferredLocale
}

function isTimeoutMemberUpdate(entry: GuildAuditLogsEntry): boolean {
	if (entry.action !== AuditLogEvent.MemberUpdate) {
		return false
	}
	return entry.changes.some((c) => c.key === "communication_disabled_until")
}

export function registerServerLogListeners(client: Client): void {
	client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
		const guild = newState.guild
		const guildId = guild.id
		const t = getTranslator(logLocaleFromVoiceState(newState))

		const oldId = oldState.channelId
		const newId = newState.channelId
		const member = newState.member
		if (!member) {
			return
		}

		if (!oldId && newId) {
			const channel = newState.channel
			await sendGuildLogEmbed(
				client,
				guildId,
				"voice",
				createDefaultEmbed({
					title: t("commands.serverlog.logs.voiceJoin.title"),
					description: t("commands.serverlog.logs.voiceJoin.description", {
						user: member.user.tag,
						channel: channel ? `#${channel.name}` : newId,
					}),
				})
			)
			return
		}

		if (oldId && !newId) {
			const channel = oldState.channel
			await sendGuildLogEmbed(
				client,
				guildId,
				"voice",
				createDefaultEmbed({
					title: t("commands.serverlog.logs.voiceLeave.title"),
					description: t("commands.serverlog.logs.voiceLeave.description", {
						user: member.user.tag,
						channel: channel ? `#${channel.name}` : oldId,
					}),
				})
			)
			return
		}

		if (oldId && newId && oldId !== newId) {
			const oldCh = oldState.channel
			const newCh = newState.channel
			await sendGuildLogEmbed(
				client,
				guildId,
				"voice",
				createDefaultEmbed({
					title: t("commands.serverlog.logs.voiceMove.title"),
					description: t("commands.serverlog.logs.voiceMove.description", {
						user: member.user.tag,
						from: oldCh ? `#${oldCh.name}` : oldId,
						to: newCh ? `#${newCh.name}` : newId,
					}),
				})
			)
		}
	})

	client.on(Events.GuildMemberAdd, async (member) => {
		const guildId = member.guild.id
		const t = getTranslator(member.guild.preferredLocale)
		await sendGuildLogEmbed(
			client,
			guildId,
			"members",
			createDefaultEmbed({
				title: t("commands.serverlog.logs.memberJoin.title"),
				description: t("commands.serverlog.logs.memberJoin.description", {
					user: member.user.tag,
					id: member.user.id,
				}),
			})
		)
	})

	client.on(Events.GuildMemberRemove, async (member) => {
		const guild = member.guild
		const guildId = guild.id
		const settings = await getGuildLogSettings(guildId)
		if (!settings?.enabled || !settings.events.members) {
			return
		}
		if (settings.events.moderation) {
			const skip = await shouldSkipLeaveDueToRecentModeration(
				guild,
				member.user.id
			)
			if (skip) {
				return
			}
		}
		const t = getTranslator(guild.preferredLocale)
		await sendGuildLogEmbed(
			client,
			guildId,
			"members",
			createDefaultEmbed({
				title: t("commands.serverlog.logs.memberLeave.title"),
				description: t("commands.serverlog.logs.memberLeave.description", {
					user: member.user.tag,
					id: member.user.id,
				}),
			})
		)
	})

	client.on(Events.GuildAuditLogEntryCreate, async (entry, guild) => {
		const guildId = guild.id
		const t = getTranslator(guild.preferredLocale)

		if (entry.action === AuditLogEvent.MemberKick) {
			const target = entry.target
			const exec = entry.executor
			const name =
				target && "tag" in target && target.tag
					? target.tag
					: entry.targetId ?? "?"
			await sendGuildLogEmbed(
				client,
				guildId,
				"moderation",
				createDefaultEmbed({
					title: t("commands.serverlog.logs.modKick.title"),
					description: t("commands.serverlog.logs.modKick.description", {
						target: name,
						moderator: exec?.tag ?? "?",
						reason: entry.reason ?? t("commands.serverlog.logs.noReason"),
					}),
				})
			)
			return
		}

		if (entry.action === AuditLogEvent.MemberBanAdd) {
			const target = entry.target
			const exec = entry.executor
			const name =
				target && "tag" in target && target.tag
					? target.tag
					: entry.targetId ?? "?"
			await sendGuildLogEmbed(
				client,
				guildId,
				"moderation",
				createDefaultEmbed({
					title: t("commands.serverlog.logs.modBan.title"),
					description: t("commands.serverlog.logs.modBan.description", {
						target: name,
						moderator: exec?.tag ?? "?",
						reason: entry.reason ?? t("commands.serverlog.logs.noReason"),
					}),
				})
			)
			return
		}

		if (entry.action === AuditLogEvent.MemberBanRemove) {
			const target = entry.target
			const exec = entry.executor
			const name =
				target && "tag" in target && target.tag
					? target.tag
					: entry.targetId ?? "?"
			await sendGuildLogEmbed(
				client,
				guildId,
				"moderation",
				createDefaultEmbed({
					title: t("commands.serverlog.logs.modUnban.title"),
					description: t("commands.serverlog.logs.modUnban.description", {
						target: name,
						moderator: exec?.tag ?? "?",
						reason: entry.reason ?? t("commands.serverlog.logs.noReason"),
					}),
				})
			)
			return
		}

		if (isTimeoutMemberUpdate(entry)) {
			const target = entry.target
			const exec = entry.executor
			const name =
				target && "tag" in target && target.tag
					? target.tag
					: entry.targetId ?? "?"
			let until = ""
			for (const change of entry.changes) {
				if (change.key === "communication_disabled_until") {
					const nv = change.new as string | null | undefined
					until = nv ? new Date(nv).toISOString() : ""
				}
			}
			await sendGuildLogEmbed(
				client,
				guildId,
				"moderation",
				createDefaultEmbed({
					title: t("commands.serverlog.logs.modTimeout.title"),
					description: t("commands.serverlog.logs.modTimeout.description", {
						target: name,
						moderator: exec?.tag ?? "?",
						until: until || "—",
						reason: entry.reason ?? t("commands.serverlog.logs.noReason"),
					}),
				})
			)
		}
	})

	client.on(Events.MessageDelete, async (message) => {
		const guild = message.guild
		if (!guild) {
			return
		}
		const guildId = guild.id
		const t = getTranslator(guild.preferredLocale)
		const author = message.author
			? `${message.author.tag} (${message.author.id})`
			: t("commands.serverlog.logs.unknownAuthor")
		await sendGuildLogEmbed(
			client,
			guildId,
			"messages",
			createDefaultEmbed({
				title: t("commands.serverlog.logs.messageDelete.title"),
				description: t("commands.serverlog.logs.messageDelete.description", {
					channel: message.channel.isTextBased()
						? `${message.channel}`
						: message.channelId,
					author,
					id: message.id,
				}),
			})
		)
	})

	client.on(Events.MessageBulkDelete, async (messages, channel) => {
		if (!channel.isTextBased() || !("guild" in channel) || !channel.guild) {
			return
		}
		const guild = channel.guild
		const guildId = guild.id
		const t = getTranslator(guild.preferredLocale)
		await sendGuildLogEmbed(
			client,
			guildId,
			"messages",
			createDefaultEmbed({
				title: t("commands.serverlog.logs.messageBulk.title"),
				description: t("commands.serverlog.logs.messageBulk.description", {
					count: messages.size,
					channel: `${channel}`,
				}),
			})
		)
	})
}
