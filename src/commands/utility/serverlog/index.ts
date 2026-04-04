import {
	InteractionContextType,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js"

import { buildServerLogPanel } from "../../../features/serverLog/panel.ts"
import { getTranslator } from "../../../i18n/index.ts"
import type { SlashCommand } from "../../../types/command.ts"
import { replyIfNotInGuild } from "../../moderation/guards.ts"

export const serverLogCommand: SlashCommand = {
	data: new SlashCommandBuilder()
		.setName("serverlog")
		.setDescription(
			"Open the log channel and category settings (channel select, multi-select, disable)."
		)
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
	async execute(interaction) {
		const t = getTranslator(interaction.locale)
		if (!(await replyIfNotInGuild(interaction))) {
			return
		}

		await interaction.reply({
			...(await buildServerLogPanel(interaction.guild!, t)),
			ephemeral: true,
		})
	},
}
