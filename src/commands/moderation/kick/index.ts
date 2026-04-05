import {
	InteractionContextType,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js"

import { colors } from "../../../constants/colors.ts"
import { getTranslator } from "../../../i18n/index.ts"
import type { SlashCommand } from "../../../types/command.ts"
import { createDefaultEmbed } from "../../../utils/defaultEmbed.ts"
import {
	ensureModerationTarget,
	replyIfNotInGuild,
	resolveMember,
} from "../guards.ts"

export const kickCommand: SlashCommand = {
	data: new SlashCommandBuilder()
		.setName("kick")
		.setDescription("Kick a member from this server.")
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
		.addUserOption((option) =>
			option
				.setName("member")
				.setDescription("The member to kick")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("reason")
				.setDescription("Reason for the kick")
				.setRequired(true)
		),
	async execute(interaction) {
		const { options, locale } = interaction
		const t = getTranslator(locale)

		if (!(await replyIfNotInGuild(interaction))) {
			return
		}

		const targetUser = options.getUser("member", true)
		const reason = options.getString("reason", true)
		const targetMember = await resolveMember(
			interaction,
			"member",
			targetUser
		)

		if (
			!(await ensureModerationTarget(
				interaction,
				targetUser,
				targetMember,
				"kick"
			))
		) {
			return
		}

		await targetMember!.kick(reason)

		const embed = createDefaultEmbed({
			color: colors.success,
			title: t("commands.kick.title"),
			description: t("commands.kick.description", { target: targetUser.tag }),
		}).addFields(
			{ name: t("commands.kick.fields.reason"), value: reason },
			{
				name: t("commands.kick.fields.moderator"),
				value: interaction.user.tag,
			},
		)

		await interaction.reply({ embeds: [embed] })
	},
}
