import {
	ChannelType,
	InteractionContextType,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js"

import {
	disableGuildLogging,
	getGuildLogSettings,
	setGuildLogChannel,
} from "../../../database/models/GuildLogSettings.ts"
import { clearLogPermissionWarningForGuild } from "../../../features/serverLog/logChannel.ts"
import { getTranslator } from "../../../i18n/index.ts"
import type { SlashCommand } from "../../../types/command.ts"
import { createDefaultEmbed } from "../../../utils/defaultEmbed.ts"
import { replyIfNotInGuild } from "../../moderation/guards.ts"

export const serverLogCommand: SlashCommand = {
	data: new SlashCommandBuilder()
		.setName("serverlog")
		.setDescription("Configure server event logging to a channel.")
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addSubcommand((sub) =>
			sub
				.setName("set")
				.setDescription("Set the channel where server logs are posted.")
				.addChannelOption((option) =>
					option
						.setName("channel")
						.setDescription("Text or announcement channel for logs")
						.setRequired(true)
						.addChannelTypes(
							ChannelType.GuildText,
							ChannelType.GuildAnnouncement
						)
				)
		)
		.addSubcommand((sub) =>
			sub.setName("disable").setDescription("Stop posting server logs.")
		)
		.addSubcommand((sub) =>
			sub
				.setName("status")
				.setDescription("Show the current logging configuration.")
		),
	async execute(interaction) {
		const t = getTranslator(interaction.locale)
		if (!(await replyIfNotInGuild(interaction))) {
			return
		}

		const guild = interaction.guild!
		const sub = interaction.options.getSubcommand(true)

		if (sub === "set") {
			const channel = interaction.options.getChannel("channel", true)
			if (
				channel.type !== ChannelType.GuildText &&
				channel.type !== ChannelType.GuildAnnouncement
			) {
				await interaction.reply({
					content: t("errors.serverlog.invalidChannel"),
					ephemeral: true,
				})
				return
			}

			const channelGuildId =
				"guildId" in channel ? channel.guildId : undefined
			if (channelGuildId !== guild.id) {
				await interaction.reply({
					content: t("errors.serverlog.invalidChannel"),
					ephemeral: true,
				})
				return
			}

			await setGuildLogChannel(guild.id, channel.id)
			clearLogPermissionWarningForGuild(guild.id)

			const embed = createDefaultEmbed({
				title: t("commands.serverlog.set.title"),
				description: t("commands.serverlog.set.description", {
					channel: `${channel}`,
				}),
			})

			await interaction.reply({ embeds: [embed], ephemeral: true })
			return
		}

		if (sub === "disable") {
			await disableGuildLogging(guild.id)
			await interaction.reply({
				content: t("commands.serverlog.disable.success"),
				ephemeral: true,
			})
			return
		}

		const settings = await getGuildLogSettings(guild.id)
		if (!settings?.channelId || !settings.enabled) {
			await interaction.reply({
				content: t("commands.serverlog.status.disabled"),
				ephemeral: true,
			})
			return
		}

		const ch = await guild.channels.fetch(settings.channelId).catch(() => null)
		const channelLabel = ch ? `${ch}` : settings.channelId

		const ev = settings.events
		const embed = createDefaultEmbed({
			title: t("commands.serverlog.status.title"),
			description: t("commands.serverlog.status.description", {
				channel: channelLabel,
			}),
		}).addFields(
			{
				name: t("commands.serverlog.status.fields.voice"),
				value: ev.voice ? t("commands.serverlog.status.on") : t("commands.serverlog.status.off"),
				inline: true,
			},
			{
				name: t("commands.serverlog.status.fields.members"),
				value: ev.members
					? t("commands.serverlog.status.on")
					: t("commands.serverlog.status.off"),
				inline: true,
			},
			{
				name: t("commands.serverlog.status.fields.moderation"),
				value: ev.moderation
					? t("commands.serverlog.status.on")
					: t("commands.serverlog.status.off"),
				inline: true,
			},
			{
				name: t("commands.serverlog.status.fields.messages"),
				value: ev.messages
					? t("commands.serverlog.status.on")
					: t("commands.serverlog.status.off"),
				inline: true,
			}
		)

		await interaction.reply({ embeds: [embed], ephemeral: true })
	},
}
