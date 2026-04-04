import { AuditLogEvent, type Guild } from "discord.js"

/**
 * Kicks and bans are logged from `guildAuditLogEntryCreate`. `guildMemberRemove`
 * also fires for those actions; when moderation logging is enabled we skip the
 * generic "member left" embed if a recent MemberKick/MemberBanAdd audit entry
 * exists for the same user (see `register.ts`).
 */
const RECENT_MS = 10_000

export async function shouldSkipLeaveDueToRecentModeration(
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
				now - entry.createdTimestamp < RECENT_MS
			) {
				return true
			}
		}
	} catch {
		return false
	}
	return false
}
