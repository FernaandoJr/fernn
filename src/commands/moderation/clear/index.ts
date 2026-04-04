import {
	InteractionContextType,
	PermissionFlagsBits,
	SlashCommandBuilder,
	type ChatInputCommandInteraction,
	type GuildTextBasedChannel,
} from "discord.js"

import { getTranslator } from "../../../i18n/index.ts"
import type { SlashCommand } from "../../../types/command.ts"
import { createDefaultEmbed } from "../../../utils/defaultEmbed.ts"
import { replyIfNotInGuild } from "../guards.ts"

function isGuildTextBulkDeletable(
	channel: ChatInputCommandInteraction["channel"]
): channel is GuildTextBasedChannel {
	return (
		channel !== null &&
		channel.isTextBased() &&
		!channel.isDMBased() &&
		"bulkDelete" in channel &&
		typeof (channel as GuildTextBasedChannel).bulkDelete === "function"
	)
}

export const clearCommand: SlashCommand = {
	data: new SlashCommandBuilder()
		.setName("clear")
		.setDescription("Bulk-delete recent messages in this channel.")
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		.addIntegerOption((option) =>
			option
				.setName("amount")
				.setDescription("Number of messages to delete (1–100)")
				.setRequired(true)
				.setMinValue(1)
				.setMaxValue(100)
		),
	async execute(interaction) {
		const t = getTranslator(interaction.locale)

		if (!(await replyIfNotInGuild(interaction))) {
			return
		}

		const amount = interaction.options.getInteger("amount", true)
		const channel = interaction.channel

		if (!isGuildTextBulkDeletable(channel)) {
			await interaction.reply({
				content: t("errors.moderation.clearNotTextChannel"),
				ephemeral: true,
			})
			return
		}

		let deleted
		try {
			deleted = await channel.bulkDelete(amount, true)
		} catch {
			await interaction.reply({
				content: t("errors.moderation.clearFailed"),
				ephemeral: true,
			})
			return
		}

		const embed = createDefaultEmbed({
			title: t("commands.clear.title"),
			description: t("commands.clear.description", {
				count: deleted.size,
				channel: channel.toString(),
			}),
		}).addFields({
			name: t("commands.clear.fields.moderator"),
			value: interaction.user.tag,
		})

		await interaction.reply({ embeds: [embed], ephemeral: true })
	},
}
