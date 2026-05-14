import {
	AuditLogEvent,
	type Client,
	Events,
	type Guild,
	type GuildAuditLogsEntry,
} from "discord.js"

import { getServerLogSettings } from "../../database/models/ServerLogSettings.ts"
import { getTranslator } from "../../i18n/index.ts"
import { createLogEmbed } from "../../utils/defaultEmbed.ts"
import { sendServerLogEmbed } from "./logChannel.ts"

const LEAVE_AUDIT_WINDOW_MS = 10_000

async function shouldSkipLeaveDueToRecentModeration(
	guild: Guild,
	userId: string
): Promise<boolean> {
	try {
		const logs = await guild.fetchAuditLogs({ limit: 15 })
		const now = Date.now()
		return logs.entries.some(
			(entry) =>
				(entry.action === AuditLogEvent.MemberKick ||
					entry.action === AuditLogEvent.MemberBanAdd) &&
				entry.targetId === userId &&
				now - entry.createdTimestamp < LEAVE_AUDIT_WINDOW_MS
		)
	} catch {
		return false
	}
}

function auditTargetName(entry: GuildAuditLogsEntry): string {
	const target = entry.target
	if (target && "username" in target && typeof target.username === "string") {
		return target.username
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
	const titleKey =
		kind === "kick"
			? "serverlogModKickTitle"
			: kind === "ban"
				? "serverlogModBanTitle"
				: "serverlogModUnbanTitle"
	const descKey =
		kind === "kick"
			? "serverlogModKickDescription"
			: kind === "ban"
				? "serverlogModBanDescription"
				: "serverlogModUnbanDescription"

	await sendServerLogEmbed(
		client,
		guildId,
		"moderation",
		createLogEmbed({
			title: t(titleKey),
			description: t(descKey, {
				target: auditTargetName(entry),
				moderator: entry.executor?.username ?? "?",
				reason: entry.reason ?? t("serverlogNoReason"),
			}),
		})
	)
}

export function registerServerLogListeners(client: Client): void {
	client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
		try {
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
				await sendServerLogEmbed(
					client,
					guildId,
					"voice",
					createLogEmbed({
						title: t("serverlogVoiceJoinTitle"),
						description: t("serverlogVoiceJoinDescription", {
							user: member.user.username,
							channel: channel ? `#${channel.name}` : newId,
						}),
					})
				)
				return
			}

			if (oldId && !newId) {
				const channel = oldState.channel
				await sendServerLogEmbed(
					client,
					guildId,
					"voice",
					createLogEmbed({
						title: t("serverlogVoiceLeaveTitle"),
						description: t("serverlogVoiceLeaveDescription", {
							user: member.user.username,
							channel: channel ? `#${channel.name}` : oldId,
						}),
					})
				)
				return
			}

			if (oldId && newId && oldId !== newId) {
				const oldCh = oldState.channel
				const newCh = newState.channel
				await sendServerLogEmbed(
					client,
					guildId,
					"voice",
					createLogEmbed({
						title: t("serverlogVoiceMoveTitle"),
						description: t("serverlogVoiceMoveDescription", {
							user: member.user.username,
							from: oldCh ? `#${oldCh.name}` : oldId,
							to: newCh ? `#${newCh.name}` : newId,
						}),
					})
				)
			}
		} catch {}
	})

	client.on(Events.GuildMemberAdd, async (member) => {
		try {
			const guildId = member.guild.id
			const t = getTranslator(member.guild.preferredLocale)
			await sendServerLogEmbed(
				client,
				guildId,
				"members",
				createLogEmbed({
					title: t("serverlogMemberJoinTitle"),
					description: t("serverlogMemberJoinDescription", {
						user: member.user.username,
						id: member.user.id,
					}),
				})
			)
		} catch {}
	})

	client.on(Events.GuildMemberRemove, async (member) => {
		try {
			const guild = member.guild
			const guildId = guild.id
			const settings = await getServerLogSettings(guildId)
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
			await sendServerLogEmbed(
				client,
				guildId,
				"members",
				createLogEmbed({
					title: t("serverlogMemberLeaveTitle"),
					description: t("serverlogMemberLeaveDescription", {
						user: member.user.username,
						id: member.user.id,
					}),
				}),
				settings
			)
		} catch {}
	})

	client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
		try {
			const guildId = newMember.guild.id
			const settings = await getServerLogSettings(guildId)
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
			const serverProfileAvatarChanged = oldMember.avatar !== newMember.avatar

			if (
				!nickChanged &&
				added.size === 0 &&
				removed.size === 0 &&
				!serverProfileAvatarChanged
			) {
				return
			}

			const t = getTranslator(newMember.guild.preferredLocale)
			const lines: string[] = []

			if (nickChanged) {
				const noneLabel = t("serverlogMemberUpdateNoNickname")
				lines.push(
					t("serverlogMemberUpdateNickname", {
						before: oldMember.nickname ?? noneLabel,
						after: newMember.nickname ?? noneLabel,
					})
				)
			}

			if (added.size > 0) {
				lines.push(
					t("serverlogMemberUpdateRolesAdded", {
						list: added.map((r) => r.name).join(", "),
					})
				)
			}
			if (removed.size > 0) {
				lines.push(
					t("serverlogMemberUpdateRolesRemoved", {
						list: removed.map((r) => r.name).join(", "),
					})
				)
			}

			if (serverProfileAvatarChanged) {
				lines.push(t("serverlogMemberUpdateAvatar"))
			}

			await sendServerLogEmbed(
				client,
				guildId,
				"members",
				createLogEmbed({
					title: t("serverlogMemberUpdateTitle"),
					description: t("serverlogMemberUpdateDescription", {
						user: newMember.user.username,
						id: newMember.id,
						details: lines.join("\n\n"),
					}),
				}),
				settings
			)
		} catch {}
	})

	client.on(Events.GuildAuditLogEntryCreate, async (entry, guild) => {
		try {
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
				await sendServerLogEmbed(
					client,
					guildId,
					"moderation",
					createLogEmbed({
						title: t("serverlogModTimeoutTitle"),
						description: t("serverlogModTimeoutDescription", {
							target: name,
							moderator: exec?.username ?? "?",
							until: until || "—",
							reason: entry.reason ?? t("serverlogNoReason"),
						}),
					})
				)
			}
		} catch {}
	})

	client.on(Events.MessageDelete, async (message) => {
		try {
			const guild = message.guild
			if (!guild) {
				return
			}
			const guildId = guild.id
			const t = getTranslator(guild.preferredLocale)
			const author = message.author
				? `${message.author.username} (${message.author.id})`
				: t("serverlogUnknownAuthor")
			await sendServerLogEmbed(
				client,
				guildId,
				"messages",
				createLogEmbed({
					title: t("serverlogMessageDeleteTitle"),
					description: t("serverlogMessageDeleteDescription", {
						channel: message.channel.isTextBased()
							? `${message.channel}`
							: message.channelId,
						author,
						id: message.id,
					}),
				})
			)
		} catch {}
	})

	client.on(Events.MessageBulkDelete, async (messages, channel) => {
		try {
			if (!channel.isTextBased() || !("guild" in channel) || !channel.guild) {
				return
			}
			const guild = channel.guild
			const guildId = guild.id
			const t = getTranslator(guild.preferredLocale)
			await sendServerLogEmbed(
				client,
				guildId,
				"messages",
				createLogEmbed({
					title: t("serverlogMessageBulkTitle"),
					description: t("serverlogMessageBulkDescription", {
						count: messages.size,
						channel: `${channel}`,
					}),
				})
			)
		} catch {}
	})
}
