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

const NICKNAME_MAX = 32

export const nicknameCommand: SlashCommand = {
	data: new SlashCommandBuilder()
		.setName("nickname")
		.setDescription("Change a member's server nickname.")
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
		.addUserOption((option) =>
			option
				.setName("member")
				.setDescription("The member to rename")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("nickname")
				.setDescription("New nickname (omit to remove)")
				.setMaxLength(NICKNAME_MAX)
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName("reason")
				.setDescription("Reason for the change (audit log)")
				.setRequired(false)
		),
	async execute(interaction) {
		const t = getTranslator(interaction.locale)

		if (!(await replyIfNotInGuild(interaction))) {
			return
		}

		const targetUser = interaction.options.getUser("member", true)
		const rawNick = interaction.options.getString("nickname")
		const reason =
			interaction.options.getString("reason") ?? t("nicknameNoReason")

		const nextNick =
			rawNick === null || rawNick.trim() === ""
				? null
				: rawNick.trim().slice(0, NICKNAME_MAX)

		const targetMember = await resolveMember(
			interaction,
			"member",
			targetUser
		)

		if (
			!(await ensureModerationTarget(interaction, targetUser, targetMember, {
				allowSelf: true,
				checkManageable: true,
			}))
		) {
			return
		}

		const beforeDisplay =
			targetMember!.nickname ?? t("nicknameNoNickname")

		await targetMember!.setNickname(nextNick, reason)

		const afterDisplay = nextNick ?? t("nicknameNoNickname")

		const embed = createDefaultEmbed({
			color: colors.success,
			title: t("nicknameTitle"),
			description: t("nicknameDescription", {
				target: targetUser.username,
			}),
		}).addFields(
			{ name: t("nicknameFieldBefore"), value: beforeDisplay },
			{ name: t("nicknameFieldAfter"), value: afterDisplay },
			{ name: t("nicknameFieldReason"), value: reason },
			{
				name: t("nicknameFieldModerator"),
				value: interaction.user.username,
			},
		)

		await interaction.reply({ embeds: [embed] })
	},
}
