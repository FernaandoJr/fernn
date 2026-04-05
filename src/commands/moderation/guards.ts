import {
	GuildMember,
	type ChatInputCommandInteraction,
	type User,
} from "discord.js"
import { getTranslator } from "../../i18n"

export async function resolveMember(
	interaction: ChatInputCommandInteraction,
	optionName: string,
	targetUser: User
): Promise<GuildMember | null> {
	const guild = interaction.guild
	if (!guild) {
		return null
	}

	const raw = interaction.options.getMember(optionName)
	if (raw instanceof GuildMember) {
		return raw
	}

	try {
		return await guild.members.fetch(targetUser.id)
	} catch {
		return null
	}
}

export async function replyIfNotInGuild(
	interaction: ChatInputCommandInteraction
): Promise<boolean> {
	const t = getTranslator(interaction.locale)

	if (!interaction.inGuild()) {
		await interaction.reply({
			content: t("errors.moderation.guildOnly"),
			ephemeral: true,
		})
		return false
	}
	return true
}

export async function ensureModerationTarget(
	interaction: ChatInputCommandInteraction,
	targetUser: User,
	targetMember: GuildMember | null,
	action: "ban" | "kick" | "mute" | "nickname"
): Promise<boolean> {
	const t = getTranslator(interaction.locale)

	if (action !== "nickname" && targetUser.id === interaction.user.id) {
		await interaction.reply({
			content: t("errors.moderation.cannotModerateSelf"),
			ephemeral: true,
		})
		return false
	}

	if (action !== "nickname" && targetUser.id === interaction.client.user.id) {
		await interaction.reply({
			content: t("errors.moderation.cannotModerateBot"),
			ephemeral: true,
		})
		return false
	}

	const guild = interaction.guild
	if (!guild) {
		return false
	}

	if (targetUser.id === guild.ownerId) {
		await interaction.reply({
			content: t("errors.moderation.cannotModerateOwner"),
			ephemeral: true,
		})
		return false
	}

	if (action !== "ban" && !targetMember) {
		await interaction.reply({
			content: t("errors.moderation.memberNotInGuild"),
			ephemeral: true,
		})
		return false
	}

	if (action === "kick" && targetMember && !targetMember.kickable) {
		await interaction.reply({
			content: t("errors.moderation.targetNotKickable"),
			ephemeral: true,
		})
		return false
	}

	if (action === "mute" && targetMember && !targetMember.moderatable) {
		await interaction.reply({
			content: t("errors.moderation.targetNotModeratable"),
			ephemeral: true,
		})
		return false
	}

	if (action === "ban" && targetMember && !targetMember.bannable) {
		await interaction.reply({
			content: t("errors.moderation.targetNotBannable"),
			ephemeral: true,
		})
		return false
	}

	if (action === "nickname" && targetMember && !targetMember.manageable) {
		await interaction.reply({
			content: t("errors.moderation.targetNotNicknamable"),
			ephemeral: true,
		})
		return false
	}

	return true
}
