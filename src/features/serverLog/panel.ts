import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelType,
	PermissionFlagsBits,
	StringSelectMenuBuilder,
	type Guild,
	type InteractionReplyOptions,
	type MessageComponentInteraction,
} from "discord.js"

import {
	disableServerLogging,
	getServerLogSettings,
	mergeDefaultEvents,
	setServerEventFlags,
	setServerLogChannel,
	type ServerLogEventFlags,
} from "../../database/models/ServerLogSettings.ts"
import { getTranslator } from "../../i18n/index.ts"
import { clearLogPermissionWarningForGuild } from "./logChannel.ts"

export const SERVERLOG_PANEL_PREFIX = "serverlog:" as const

type Translator = ReturnType<typeof getTranslator>

function opt(
	t: Translator,
	key: "voice" | "members" | "moderation" | "messages",
	on: boolean
) {
	return {
		label: t(`commands.serverlog.panel.options.${key}`),
		value: key,
		default: on,
	}
}

export async function buildServerLogPanel(
	guild: Guild,
	t: Translator
): Promise<Pick<InteractionReplyOptions, "components" | "embeds">> {
	const settings = await getServerLogSettings(guild.id)
	const ev = mergeDefaultEvents(settings?.events)

	const channelSelect = new ChannelSelectMenuBuilder()
		.setCustomId(`${SERVERLOG_PANEL_PREFIX}channel`)
		.setPlaceholder(t("commands.serverlog.panel.selectChannel"))
		.setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
		.setMinValues(1)
		.setMaxValues(1)

	if (settings?.channelId) {
		channelSelect.setDefaultChannels(settings.channelId)
	}

	const stringSelect = new StringSelectMenuBuilder()
		.setCustomId(`${SERVERLOG_PANEL_PREFIX}categories`)
		.setPlaceholder(t("commands.serverlog.panel.selectCategories"))
		.setMinValues(0)
		.setMaxValues(4)
		.addOptions(
			opt(t, "voice", ev.voice),
			opt(t, "members", ev.members),
			opt(t, "moderation", ev.moderation),
			opt(t, "messages", ev.messages)
		)

	const rows: ActionRowBuilder[] = [
		new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
			channelSelect
		),
		new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			stringSelect
		),
	]

	if (settings?.enabled) {
		rows.push(
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(`${SERVERLOG_PANEL_PREFIX}disable`)
					.setLabel(t("commands.serverlog.panel.disableButton"))
					.setStyle(ButtonStyle.Danger)
			)
		)
	}

	return {
		embeds: [],
		components: rows as InteractionReplyOptions["components"],
	}
}

function flagsFromValues(values: readonly string[]): ServerLogEventFlags {
	const s = new Set(values)
	return {
		voice: s.has("voice"),
		members: s.has("members"),
		moderation: s.has("moderation"),
		messages: s.has("messages"),
	}
}

export async function handleServerLogPanelInteraction(
	interaction: MessageComponentInteraction
): Promise<void> {
	if (!interaction.customId.startsWith(SERVERLOG_PANEL_PREFIX)) {
		return
	}
	if (!interaction.inGuild() || !interaction.guild) {
		return
	}
	if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
		const t = getTranslator(interaction.locale)
		const payload = {
			content: t("errors.serverlog.noPermission"),
			ephemeral: true,
		}
		if (interaction.deferred || interaction.replied) {
			await interaction.followUp(payload)
		} else {
			await interaction.reply(payload)
		}
		return
	}

	const guild = interaction.guild
	const t = getTranslator(interaction.locale)

	try {
		if (
			interaction.isButton() &&
			interaction.customId === `${SERVERLOG_PANEL_PREFIX}disable`
		) {
			await disableServerLogging(guild.id)
			await interaction.update({
				content: t("commands.serverlog.disable.success"),
				embeds: [],
				components: [],
			})
			return
		}

		if (
			interaction.isChannelSelectMenu() &&
			interaction.customId === `${SERVERLOG_PANEL_PREFIX}channel`
		) {
			const id = interaction.values[0]
			if (!id) {
				return
			}
			await setServerLogChannel(guild.id, id)
			clearLogPermissionWarningForGuild(guild.id)
			await interaction.update(await buildServerLogPanel(guild, t))
			return
		}

		if (
			interaction.isStringSelectMenu() &&
			interaction.customId === `${SERVERLOG_PANEL_PREFIX}categories`
		) {
			await setServerEventFlags(
				guild.id,
				flagsFromValues(interaction.values)
			)
			await interaction.update(await buildServerLogPanel(guild, t))
			return
		}
	} catch {
		const err = getTranslator(interaction.locale)(
			"errors.commandExecutionFailed"
		)
		if (interaction.deferred || interaction.replied) {
			await interaction
				.followUp({ content: err, ephemeral: true })
				.catch(() => {})
		} else {
			await interaction
				.reply({ content: err, ephemeral: true })
				.catch(() => {})
		}
	}
}
