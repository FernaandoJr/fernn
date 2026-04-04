import {
	AttachmentBuilder,
	InteractionContextType,
	SlashCommandBuilder,
	userMention,
} from "discord.js"

import { getTranslator } from "../../../i18n/index.ts"
import type { SlashCommand } from "../../../types/command.ts"
import { createDefaultEmbed } from "../../../utils/defaultEmbed.ts"
import { replyIfNotInGuild } from "../../moderation/guards.ts"
import {
	shipMessageIndex,
	shipPercentFromPairKey,
	shipTierForPercent,
	sortedPairKey,
} from "./utils/shipPair.ts"
import { renderShipBanner } from "./utils/renderShipBanner.ts"

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((x) => typeof x === "string")
}

export const shipCommand: SlashCommand = {
	data: new SlashCommandBuilder()
		.setName("ship")
		.setDescription(
			"Compatibility calculator — deterministic score for two users.",
		)
		.setContexts(InteractionContextType.Guild)
		.addUserOption((option) =>
			option
				.setName("user1")
				.setDescription("First user")
				.setRequired(true),
		)
		.addUserOption((option) =>
			option
				.setName("user2")
				.setDescription("Second user")
				.setRequired(true),
		),
	async execute(interaction) {
		const t = getTranslator(interaction.locale)

		if (!(await replyIfNotInGuild(interaction))) {
			return
		}

		const user1 = interaction.options.getUser("user1", true)
		const user2 = interaction.options.getUser("user2", true)

		if (user1.id === user2.id) {
			await interaction.reply({
				content: t("errors.ship.sameUser"),
				ephemeral: true,
			})
			return
		}

		const pairKey = sortedPairKey(user1.id, user2.id)
		const percent = shipPercentFromPairKey(pairKey)
		const tierKey = shipTierForPercent(percent)

		const messagesRaw = t(`commands.ship.tiers.${tierKey}.messages`, {
			returnObjects: true,
		})
		const messages = isStringArray(messagesRaw) ? messagesRaw : []
		const idx = shipMessageIndex(pairKey, tierKey, messages.length)
		const verdict =
			messages[idx] ?? t("commands.ship.fallbackVerdict")

		const pairLabel = `${userMention(user1.id)} ${t("commands.ship.pairSeparator")} ${userMention(user2.id)}`

		const embed = createDefaultEmbed({
			title: t("commands.ship.title"),
			description: t("commands.ship.description", { pair: pairLabel }),
		}).addFields(
			{
				name: t("commands.ship.fields.score"),
				value: `${percent}%`,
				inline: true,
			},
			{
				name: t("commands.ship.fields.verdict"),
				value: verdict,
				inline: false,
			},
		)

		let files: AttachmentBuilder[] | undefined
		try {
			const png = await renderShipBanner(user1, user2, pairKey, percent)
			const attachment = new AttachmentBuilder(png, { name: "ship.png" })
			embed.setImage("attachment://ship.png")
			files = [attachment]
		} catch {
			// Banner is optional; embed still works without avatar composite.
		}

		await interaction.reply({ embeds: [embed], ...(files ? { files } : {}) })
	},
}
