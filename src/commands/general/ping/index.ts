import { SlashCommandBuilder } from "discord.js"

import { colors } from "../../../constants/colors.ts"
import { getTranslator } from "../../../i18n/index.ts"
import type { SlashCommand } from "../../../types/command.ts"
import { createDefaultEmbed } from "../../../utils/defaultEmbed.ts"

export const pingCommand: SlashCommand = {
	data: new SlashCommandBuilder()
		.setName("ping")
		.setDescription("Check whether the bot is responding."),
	async execute(interaction) {
		const t = getTranslator(interaction.locale)
		const embed = createDefaultEmbed({
			color: colors.info,
			title: t("pingTitle"),
			description: t("pingDescription"),
		}).addFields(
			{
				name: t("pingFieldApiLatency"),
				value: `${Math.round(interaction.client.ws.ping)} ms`,
				inline: true,
			},
			{
				name: t("pingFieldCommand"),
				value: `/${interaction.commandName}`,
				inline: true,
			},
		)

		await interaction.reply({ embeds: [embed] })
	},
}
