import type { Guild, GuildMember, Interaction } from "discord.js"
import { roleMention } from "discord.js"

import { getTranslator } from "../../../../i18n/index.ts"
import { truncateJoin } from "./truncateJoin.ts"

/** Discord embed field value max length. */
export const EMBED_FIELD_VALUE_MAX = 1024

/** Sort: highest position first; roleCount excludes @everyone. */
export function formatMemberRolesFieldValue(
	member: GuildMember,
	guild: Guild,
	interaction: Interaction
): { value: string; roleCount: number } {
	const t = getTranslator(interaction.locale)
	const roleMentions = member.roles.cache
		.filter((r) => r.id !== guild.id)
		.sort((a, b) => b.position - a.position)
		.map((r) => roleMention(r.id))

	const roleCount = roleMentions.length

	if (roleCount === 0) {
		return { value: t("commands.userInfo.noRoles"), roleCount: 0 }
	}

	const value = truncateJoin(
		roleMentions,
		", ",
		EMBED_FIELD_VALUE_MAX,
		(hidden) => t("commands.userInfo.rolesMore", { count: hidden })
	)

	return { value, roleCount }
}
