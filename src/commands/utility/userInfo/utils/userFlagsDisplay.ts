import {
	UserFlags,
	type Interaction,
	type UserFlagsBitField,
	type UserFlagsString,
} from "discord.js"

import badgeFlagsJson from "./user-badge-flags.json" with { type: "json" }
import { getTranslator } from "../../../../i18n/index.ts"

type BadgeEntry = {
	flag: string
	emojiId: string
	emojiName: string
}

const userFlagStrings = new Set(
	Object.keys(UserFlags).filter((k) => Number.isNaN(Number(k)))
)

const badgeEntries: BadgeEntry[] = badgeFlagsJson.badges

for (const entry of badgeEntries) {
	if (!userFlagStrings.has(entry.flag)) {
		console.warn(
			`[user-badge-flags] unknown UserFlags key "${entry.flag}" — check spelling or discord.js version`
		)
	}
}

export function formatUserBadgeField(
	flags: Readonly<UserFlagsBitField> | null | undefined,
	interaction: Interaction
): string {
	const t = getTranslator(interaction.locale)
	const active = new Set(flags?.toArray() ?? [])
	const parts: string[] = []

	for (const { flag, emojiId, emojiName } of badgeEntries) {
		if (active.has(flag as UserFlagsString)) {
			parts.push(`<:${emojiName}:${emojiId}>`)
		}
	}

	if (parts.length === 0) {
		return t("commands.userInfo.noBadges")
	}

	return parts.join(" ")
}
