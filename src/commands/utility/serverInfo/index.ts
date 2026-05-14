import {
	ChannelType,
	GuildExplicitContentFilter,
	GuildPremiumTier,
	GuildVerificationLevel,
	InteractionContextType,
	SlashCommandBuilder,
	time,
	TimestampStyles,
	userMention,
	type Guild,
} from "discord.js"

import { colors } from "../../../constants/colors.ts"
import { getTranslator } from "../../../i18n/index.ts"
import type { SlashCommand } from "../../../types/command.ts"
import { createDefaultEmbed } from "../../../utils/defaultEmbed.ts"
import { replyIfNotInGuild } from "../../moderation/guards.ts"

function countGuildChannels(guild: Guild) {
	return guild.channels.cache.reduce(
		(acc, ch) => {
			switch (ch.type) {
				case ChannelType.GuildText: acc.text++; break
				case ChannelType.GuildAnnouncement: acc.announcement++; break
				case ChannelType.GuildVoice: acc.voice++; break
				case ChannelType.GuildCategory: acc.category++; break
				case ChannelType.GuildForum: acc.forum++; break
				case ChannelType.GuildStageVoice: acc.stage++; break
				case ChannelType.GuildMedia: acc.media++; break
			}
			return acc
		},
		{ text: 0, voice: 0, category: 0, forum: 0, stage: 0, announcement: 0, media: 0 }
	)
}

function verificationLabel(
	t: ReturnType<typeof getTranslator>,
	level: GuildVerificationLevel
): string {
	switch (level) {
		case GuildVerificationLevel.None: return t("serverInfoVerificationNone")
		case GuildVerificationLevel.Low: return t("serverInfoVerificationLow")
		case GuildVerificationLevel.Medium: return t("serverInfoVerificationMedium")
		case GuildVerificationLevel.High: return t("serverInfoVerificationHigh")
		case GuildVerificationLevel.VeryHigh: return t("serverInfoVerificationVeryHigh")
		default: return t("serverInfoVerificationNone")
	}
}

function explicitFilterLabel(
	t: ReturnType<typeof getTranslator>,
	level: GuildExplicitContentFilter
): string {
	switch (level) {
		case GuildExplicitContentFilter.Disabled: return t("serverInfoFilterDisabled")
		case GuildExplicitContentFilter.MembersWithoutRoles: return t("serverInfoFilterMembersWithoutRoles")
		case GuildExplicitContentFilter.AllMembers: return t("serverInfoFilterAllMembers")
		default: return t("serverInfoFilterDisabled")
	}
}

function premiumTierLabel(
	t: ReturnType<typeof getTranslator>,
	tier: GuildPremiumTier
): string {
	switch (tier) {
		case GuildPremiumTier.None: return t("serverInfoBoostTierNone")
		case GuildPremiumTier.Tier1: return t("serverInfoBoostTier1")
		case GuildPremiumTier.Tier2: return t("serverInfoBoostTier2")
		case GuildPremiumTier.Tier3: return t("serverInfoBoostTier3")
		default: return t("serverInfoBoostTierNone")
	}
}

export const serverInfoCommand: SlashCommand = {
	data: new SlashCommandBuilder()
		.setName("server-info")
		.setDescription("Show information about this server.")
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		const t = getTranslator(interaction.locale)

		if (!(await replyIfNotInGuild(interaction))) {
			return
		}

		const guild = interaction.guild!
		await guild.fetch()

		const counts = countGuildChannels(guild)

		const createdTs = guild.createdTimestamp
		const createdText = `${time(
			Math.floor(createdTs / 1000),
			TimestampStyles.LongDate
		)} (${time(
			Math.floor(createdTs / 1000),
			TimestampStyles.RelativeTime
		)})`

		const channelsLine = t("serverInfoChannelSummary", {
			text: counts.text,
			voice: counts.voice,
			category: counts.category,
			forum: counts.forum,
			stage: counts.stage,
			announcement: counts.announcement,
			media: counts.media,
		})

		const boostLine = t("serverInfoBoostSummary", {
			count: guild.premiumSubscriptionCount ?? 0,
			tier: premiumTierLabel(t, guild.premiumTier),
		})

		const embed = createDefaultEmbed({
			color: colors.info,
			title: guild.name,
			description: guild.description ?? undefined,
		})
			.setThumbnail(guild.iconURL({ size: 256 }))
			.addFields(
				{
					name: t("serverInfoFieldId"),
					value: guild.id,
					inline: true,
				},
				{
					name: t("serverInfoFieldOwner"),
					value: userMention(guild.ownerId),
					inline: true,
				},
				{
					name: t("serverInfoFieldCreated"),
					value: createdText,
					inline: false,
				},
				{
					name: t("serverInfoFieldMembers"),
					value: String(guild.memberCount),
					inline: true,
				},
				{
					name: t("serverInfoFieldChannels"),
					value: channelsLine,
					inline: false,
				},
				{
					name: t("serverInfoFieldBoost"),
					value: boostLine,
					inline: false,
				},
				{
					name: t("serverInfoFieldVerification"),
					value: verificationLabel(t, guild.verificationLevel),
					inline: true,
				},
				{
					name: t("serverInfoFieldExplicitFilter"),
					value: explicitFilterLabel(t, guild.explicitContentFilter),
					inline: true,
				}
			)

		await interaction.reply({ embeds: [embed] })
	},
}
