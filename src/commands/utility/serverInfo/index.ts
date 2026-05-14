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
		case GuildVerificationLevel.None:
			return t("commands.serverInfo.verification.none")
		case GuildVerificationLevel.Low:
			return t("commands.serverInfo.verification.low")
		case GuildVerificationLevel.Medium:
			return t("commands.serverInfo.verification.medium")
		case GuildVerificationLevel.High:
			return t("commands.serverInfo.verification.high")
		case GuildVerificationLevel.VeryHigh:
			return t("commands.serverInfo.verification.veryHigh")
		default:
			return t("commands.serverInfo.verification.none")
	}
}

function explicitFilterLabel(
	t: ReturnType<typeof getTranslator>,
	level: GuildExplicitContentFilter
): string {
	switch (level) {
		case GuildExplicitContentFilter.Disabled:
			return t("commands.serverInfo.explicitFilter.disabled")
		case GuildExplicitContentFilter.MembersWithoutRoles:
			return t("commands.serverInfo.explicitFilter.membersWithoutRoles")
		case GuildExplicitContentFilter.AllMembers:
			return t("commands.serverInfo.explicitFilter.allMembers")
		default:
			return t("commands.serverInfo.explicitFilter.disabled")
	}
}

function premiumTierLabel(
	t: ReturnType<typeof getTranslator>,
	tier: GuildPremiumTier
): string {
	switch (tier) {
		case GuildPremiumTier.None:
			return t("commands.serverInfo.premiumTier.none")
		case GuildPremiumTier.Tier1:
			return t("commands.serverInfo.premiumTier.tier1")
		case GuildPremiumTier.Tier2:
			return t("commands.serverInfo.premiumTier.tier2")
		case GuildPremiumTier.Tier3:
			return t("commands.serverInfo.premiumTier.tier3")
		default:
			return t("commands.serverInfo.premiumTier.none")
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

		const channelsLine = t("commands.serverInfo.channelSummary", {
			text: counts.text,
			voice: counts.voice,
			category: counts.category,
			forum: counts.forum,
			stage: counts.stage,
			announcement: counts.announcement,
			media: counts.media,
		})

		const boostLine = t("commands.serverInfo.boostSummary", {
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
					name: t("commands.serverInfo.fields.id"),
					value: guild.id,
					inline: true,
				},
			{
				name: t("commands.serverInfo.fields.owner"),
				value: userMention(guild.ownerId),
				inline: true,
			},
				{
					name: t("commands.serverInfo.fields.created"),
					value: createdText,
					inline: false,
				},
				{
					name: t("commands.serverInfo.fields.members"),
					value: String(guild.memberCount),
					inline: true,
				},
				{
					name: t("commands.serverInfo.fields.channels"),
					value: channelsLine,
					inline: false,
				},
				{
					name: t("commands.serverInfo.fields.boost"),
					value: boostLine,
					inline: false,
				},
				{
					name: t("commands.serverInfo.fields.verification"),
					value: verificationLabel(t, guild.verificationLevel),
					inline: true,
				},
				{
					name: t("commands.serverInfo.fields.explicitFilter"),
					value: explicitFilterLabel(t, guild.explicitContentFilter),
					inline: true,
				}
			)

		await interaction.reply({ embeds: [embed] })
	},
}
