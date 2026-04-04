import { SlashCommandBuilder } from "discord.js"

import { getTranslator } from "../../../i18n/index.ts"
import type { SlashCommand } from "../../../types/command.ts"
import { createDefaultEmbed } from "../../../utils/defaultEmbed.ts"

function formatUptimeSeconds(totalSeconds: number): string {
	const s = Math.floor(totalSeconds)
	const days = Math.floor(s / 86_400)
	const hours = Math.floor((s % 86_400) / 3600)
	const minutes = Math.floor((s % 3600) / 60)
	const secs = s % 60

	const parts: string[] = []
	if (days > 0) parts.push(`${days}d`)
	if (hours > 0 || days > 0) parts.push(`${hours}h`)
	if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`)
	parts.push(`${secs}s`)

	return parts.join(" ")
}

export const uptimeCommand: SlashCommand = {
	data: new SlashCommandBuilder()
		.setName("uptime")
		.setDescription("Show how long the bot has been running."),
	async execute(interaction) {
		const t = getTranslator(interaction.locale)
		const uptimeSec = process.uptime()

		const embed = createDefaultEmbed({
			title: t("commands.uptime.title"),
			description: t("commands.uptime.description"),
		}).addFields({
			name: t("commands.uptime.fields.process"),
			value: formatUptimeSeconds(uptimeSec),
			inline: false,
		})

		await interaction.reply({ embeds: [embed] })
	},
}
