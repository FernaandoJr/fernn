import {
	GuildMember,
	InteractionContextType,
	SlashCommandBuilder,
	time,
	TimestampStyles,
	userMention,
} from "discord.js"

import { colors } from "../../../constants/colors.ts"
import { getTranslator } from "../../../i18n/index.ts"
import type { SlashCommand } from "../../../types/command.ts"
import { createDefaultEmbed } from "../../../utils/defaultEmbed.ts"
import { replyIfNotInGuild } from "../../moderation/guards.ts"
import { formatMemberRolesFieldValue } from "./utils/memberRolesField.ts"
import { formatUserBadgeField } from "./utils/userFlagsDisplay.ts"

export const userInfoCommand: SlashCommand = {
	data: new SlashCommandBuilder()
		.setName("user-info")
		.setDescription("Show information about a member of this server.")
		.setContexts(InteractionContextType.Guild)
		.addUserOption((option) =>
			option
				.setName("user")
				.setDescription("Member to inspect (defaults to you)")
				.setRequired(false)
		),
	async execute(interaction) {
		const t = getTranslator(interaction.locale)

		if (!(await replyIfNotInGuild(interaction))) {
			return
		}

		const guild = interaction.guild!
		const targetUser =
			interaction.options.getUser("user") ?? interaction.user

		const rawMember = interaction.options.getMember("user")
		let member: GuildMember | null =
			rawMember instanceof GuildMember ? rawMember : null

		if (!member && targetUser.id === interaction.user.id) {
			if (interaction.member instanceof GuildMember) {
				member = interaction.member
			}
		}

		if (!member) {
			try {
				member = await guild.members.fetch({ user: targetUser })
			} catch {
				member = null
			}
		}

		if (!member) {
			await interaction.reply({
				content: t("errorUserNotMember"),
				ephemeral: true,
			})
			return
		}

		const user = await member.user.fetch()

		const joinedTs = member.joinedTimestamp
		const joinedText =
			joinedTs !== null
				? `${time(
						Math.floor(joinedTs / 1000),
						TimestampStyles.LongDate
				  )} (${time(
						Math.floor(joinedTs / 1000),
						TimestampStyles.RelativeTime
				  )})`
				: t("userInfoUnknown")

		const createdTs = user.createdTimestamp
		const createdText = `${time(
			Math.floor(createdTs / 1000),
			TimestampStyles.LongDate
		)} (${time(
			Math.floor(createdTs / 1000),
			TimestampStyles.RelativeTime
		)})`

		const { value: rolesValue, roleCount } = formatMemberRolesFieldValue(
			member,
			guild,
			interaction
		)

		const displayName =
			member.displayName ?? user.globalName ?? user.username

		const embed = createDefaultEmbed({
			color: colors.info,
			description: userMention(user.id),
		})
			.setAuthor({
				name: displayName,
				iconURL: member.displayAvatarURL({ size: 256 }),
			})
			.setThumbnail(member.displayAvatarURL({ size: 256 }))
			.addFields(
				{
					name: t("userInfoFieldBadges"),
					value: formatUserBadgeField(user.flags, interaction),
					inline: true,
				},
				{
					name: t("userInfoFieldNickname"),
					value: member.nickname ?? t("userInfoNoNickname"),
					inline: true,
				},
				{
					name: t("userInfoFieldId"),
					value: user.id,
					inline: false,
				},
				{
					name: t("userInfoFieldJoined"),
					value: joinedText,
					inline: false,
				},
				{
					name: t("userInfoFieldCreated"),
					value: createdText,
					inline: false,
				},
				{
					name: t("userInfoFieldRoles", {
						count: roleCount,
					}),
					value: rolesValue,
					inline: false,
				}
			)

		await interaction.reply({ embeds: [embed] })
	},
}
