import {
	AuditLogEvent,
	type Client,
	Events,
	type Guild,
	type GuildAuditLogsEntry,
} from "discord.js"

import { getGuildLogSettings } from "../../database/models/GuildLogSettings.ts"
import { getTranslator } from "../../i18n/index.ts"
import { createLogEmbed } from "../../utils/defaultEmbed.ts"
import { sendGuildLogEmbed } from "./logChannel.ts"

const LEAVE_AUDIT_WINDOW_MS = 10_000

/**
 * Kicks/bans are logged from `guildAuditLogEntryCreate`. `guildMemberRemove`
 * also fires; when moderation logging is on we skip "member left" if a recent
 * kick/ban audit exists for that user.
 */
async function shouldSkipLeaveDueToRecentModeration(
	guild: Guild,
	userId: string
): Promise<boolean> {
	try {
		const logs = await guild.fetchAuditLogs({ limit: 15 })
		const now = Date.now()
		for (const [, entry] of logs.entries) {
			if (
				(entry.action === AuditLogEvent.MemberKick ||
					entry.action === AuditLogEvent.MemberBanAdd) &&
				entry.targetId === userId &&
				now - entry.createdTimestamp < LEAVE_AUDIT_WINDOW_MS
			) {
				return true
			}
		}
	} catch {
		return false
	}
	return false
}

function auditTargetName(entry: GuildAuditLogsEntry): string {
	const target = entry.target
	if (target && "tag" in target && typeof target.tag === "string") {
		return target.tag
	}
	return entry.targetId ?? "?"
}

function isTimeoutMemberUpdate(entry: GuildAuditLogsEntry): boolean {
	if (entry.action !== AuditLogEvent.MemberUpdate) {
		return false
	}
	return entry.changes.some((c) => c.key === "communication_disabled_until")
}

async function sendModerationAuditEmbed(
	client: Client,
	guildId: string,
	t: ReturnType<typeof getTranslator>,
	entry: GuildAuditLogsEntry,
	kind: "kick" | "ban" | "unban"
): Promise<void> {
	const key =
		kind === "kick" ? "modKick" : kind === "ban" ? "modBan" : "modUnban"
	const base = `commands.serverlog.logs.${key}`
	await sendGuildLogEmbed(
		client,
		guildId,
		"moderation",
		createLogEmbed({
			title: t(`${base}.title`),
			description: t(`${base}.description`, {
				target: auditTargetName(entry),
				moderator: entry.executor?.tag ?? "?",
				reason: entry.reason ?? t("commands.serverlog.logs.noReason"),
			}),
		})
	)
}

export function registerServerLogListeners(client: Client): void {
	client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
		const guild = newState.guild
		const guildId = guild.id
		const t = getTranslator(newState.guild.preferredLocale)

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
				createLogEmbed({
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
				createLogEmbed({
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
				createLogEmbed({
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
			createLogEmbed({
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
			createLogEmbed({
				title: t("commands.serverlog.logs.memberLeave.title"),
				description: t("commands.serverlog.logs.memberLeave.description", {
					user: member.user.tag,
					id: member.user.id,
				}),
			}),
			settings
		)
	})

	client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
		const guildId = newMember.guild.id
		const settings = await getGuildLogSettings(guildId)
		if (!settings?.enabled || !settings.events.members) {
			return
		}

		const everyoneId = newMember.guild.id
		const added = newMember.roles.cache.filter(
			(r) => r.id !== everyoneId && !oldMember.roles.cache.has(r.id)
		)
		const removed = oldMember.roles.cache.filter(
			(r) => r.id !== everyoneId && !newMember.roles.cache.has(r.id)
		)

		const nickChanged = oldMember.nickname !== newMember.nickname
		const guildAvatarChanged = oldMember.avatar !== newMember.avatar

		if (
			!nickChanged &&
			added.size === 0 &&
			removed.size === 0 &&
			!guildAvatarChanged
		) {
			return
		}

		const t = getTranslator(newMember.guild.preferredLocale)
		const lines: string[] = []

		if (nickChanged) {
			const noneLabel = t("commands.serverlog.logs.memberUpdate.noNickname")
			lines.push(
				t("commands.serverlog.logs.memberUpdate.nickname", {
					before: oldMember.nickname ?? noneLabel,
					after: newMember.nickname ?? noneLabel,
				})
			)
		}

		if (added.size > 0) {
			lines.push(
				t("commands.serverlog.logs.memberUpdate.rolesAdded", {
					list: added.map((r) => r.name).join(", "),
				})
			)
		}
		if (removed.size > 0) {
			lines.push(
				t("commands.serverlog.logs.memberUpdate.rolesRemoved", {
					list: removed.map((r) => r.name).join(", "),
				})
			)
		}

		if (guildAvatarChanged) {
			lines.push(t("commands.serverlog.logs.memberUpdate.guildAvatar"))
		}

		await sendGuildLogEmbed(
			client,
			guildId,
			"members",
			createLogEmbed({
				title: t("commands.serverlog.logs.memberUpdate.title"),
				description: t("commands.serverlog.logs.memberUpdate.description", {
					user: newMember.user.tag,
					id: newMember.id,
					details: lines.join("\n\n"),
				}),
			}),
			settings
		)
	})

	client.on(Events.GuildAuditLogEntryCreate, async (entry, guild) => {
		const guildId = guild.id
		const t = getTranslator(guild.preferredLocale)

		if (entry.action === AuditLogEvent.MemberKick) {
			await sendModerationAuditEmbed(client, guildId, t, entry, "kick")
			return
		}

		if (entry.action === AuditLogEvent.MemberBanAdd) {
			await sendModerationAuditEmbed(client, guildId, t, entry, "ban")
			return
		}

		if (entry.action === AuditLogEvent.MemberBanRemove) {
			await sendModerationAuditEmbed(client, guildId, t, entry, "unban")
			return
		}

		if (isTimeoutMemberUpdate(entry)) {
			const exec = entry.executor
			const name = auditTargetName(entry)
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
				createLogEmbed({
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
			createLogEmbed({
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
			createLogEmbed({
				title: t("commands.serverlog.logs.messageBulk.title"),
				description: t("commands.serverlog.logs.messageBulk.description", {
					count: messages.size,
					channel: `${channel}`,
				}),
			})
		)
	})
}
