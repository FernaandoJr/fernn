import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	PermissionFlagsBits,
	StringSelectMenuBuilder,
	type Guild,
	type InteractionReplyOptions,
	type MessageComponentInteraction,
} from "discord.js"
import { colors } from "../../constants/colors.ts"
import {
	SERVER_ICON_DEFAULT_INTERVAL_MINUTES,
	SERVER_ICON_MAX_IMAGES,
	SERVER_ICON_MAX_INTERVAL_MINUTES,
	SERVER_ICON_MIN_INTERVAL_MINUTES,
} from "../../constants/serverIcon.ts"
import {
	getServerIconRotation,
	pullServerIconImageById,
	upsertServerIconRotation,
	type ServerIconRotationDoc,
} from "../../database/models/ServerIconRotation.ts"
import { getTranslator } from "../../i18n/index.ts"
import { r2DeleteObject } from "../../storage/r2Client.ts"
import { createDefaultEmbed } from "../../utils/defaultEmbed.ts"

export const SERVERICON_PANEL_PREFIX = "servericon:" as const

type Translator = ReturnType<typeof getTranslator>

const INTERVAL_PRESETS = [5, 10, 15, 30, 60] as const

function clampIntervalMinutes(m: number): number {
	return Math.min(
		SERVER_ICON_MAX_INTERVAL_MINUTES,
		Math.max(SERVER_ICON_MIN_INTERVAL_MINUTES, m)
	)
}

function defaultDoc(guildId: string): ServerIconRotationDoc {
	return {
		guildId,
		enabled: false,
		intervalMinutes: SERVER_ICON_DEFAULT_INTERVAL_MINUTES,
		cursor: 0,
		lastRotationAt: null,
		images: [],
	}
}

export async function buildServerIconPanel(
	guild: Guild,
	t: Translator
): Promise<Pick<InteractionReplyOptions, "components" | "embeds">> {
	const raw = await getServerIconRotation(guild.id)
	const doc = raw ?? defaultDoc(guild.id)

	const rotationLine = doc.enabled
		? t("commands.servericon.panel.embed.rotationOn")
		: t("commands.servericon.panel.embed.rotationOff")

	const imageLines =
		doc.images.length === 0
			? t("commands.servericon.panel.embed.noImages")
			: doc.images
					.map((img) => {
						const label =
							img.label ?? t("commands.servericon.panel.noLabel")
						return t("commands.servericon.panel.embed.imageLine", {
							label,
							userId: img.addedByUserId,
						})
					})
					.join("\n")

	const description = [
		rotationLine,
		"",
		t("commands.servericon.panel.embed.intervalLine", {
			minutes: doc.intervalMinutes,
		}),
		t("commands.servericon.panel.embed.libraryLine", {
			count: doc.images.length,
			max: SERVER_ICON_MAX_IMAGES,
		}),
		"",
		t("commands.servericon.panel.embed.imagesSection"),
		imageLines,
		"",
		t("commands.servericon.panel.embed.hint"),
	].join("\n")

	const embed = createDefaultEmbed({
		color: colors.info,
		title: t("commands.servericon.panel.title"),
		description,
	})

	const rows: ActionRowBuilder[] = []

	const intervalSelect = new StringSelectMenuBuilder()
		.setCustomId(`${SERVERICON_PANEL_PREFIX}interval`)
		.setPlaceholder(t("commands.servericon.panel.selectInterval"))
		.setMinValues(1)
		.setMaxValues(1)

	for (const m of INTERVAL_PRESETS) {
		if (
			m < SERVER_ICON_MIN_INTERVAL_MINUTES ||
			m > SERVER_ICON_MAX_INTERVAL_MINUTES
		) {
			continue
		}
		intervalSelect.addOptions({
			label: t("commands.servericon.panel.intervalMinutes", {
				minutes: m,
			}),
			value: String(m),
			default: doc.intervalMinutes === m,
		})
	}

	rows.push(
		new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			intervalSelect
		)
	)

	if (doc.images.length > 0) {
		const removeSelect = new StringSelectMenuBuilder()
			.setCustomId(`${SERVERICON_PANEL_PREFIX}remove`)
			.setPlaceholder(t("commands.servericon.panel.removePlaceholder"))
			.setMinValues(1)
			.setMaxValues(1)

		for (const [i, img] of doc.images.entries()) {
			const label = img.label ?? t("commands.servericon.panel.noLabel")
			const shortLabel =
				label.length > 80 ? `${label.slice(0, 77)}...` : label
			removeSelect.addOptions({
				label: `${i + 1}. ${shortLabel}`.slice(0, 100),
				value: img.id,
			})
		}

		rows.push(
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				removeSelect
			)
		)
	}

	rows.push(
		new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`${SERVERICON_PANEL_PREFIX}toggle`)
				.setLabel(
					doc.enabled
						? t("commands.servericon.panel.buttonToggleWhenOn")
						: t("commands.servericon.panel.buttonToggleWhenOff")
				)
				.setStyle(
					doc.enabled ? ButtonStyle.Secondary : ButtonStyle.Success
				),
			new ButtonBuilder()
				.setCustomId(`${SERVERICON_PANEL_PREFIX}refresh`)
				.setLabel(t("commands.servericon.panel.buttonRefresh"))
				.setStyle(ButtonStyle.Primary)
		)
	)

	return {
		embeds: [embed],
		components: rows as InteractionReplyOptions["components"],
	}
}

export async function handleServerIconPanelInteraction(
	interaction: MessageComponentInteraction
): Promise<void> {
	if (!interaction.customId.startsWith(SERVERICON_PANEL_PREFIX)) {
		return
	}
	if (!interaction.inGuild() || !interaction.guild) {
		return
	}
	if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
		const tr = getTranslator(interaction.locale)
		const payload = {
			content: tr("errors.servericon.noPanelPermission"),
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
		if (interaction.isButton()) {
			if (interaction.customId === `${SERVERICON_PANEL_PREFIX}toggle`) {
				const current = await getServerIconRotation(guild.id)
				const wasEnabled = current?.enabled ?? false
				await upsertServerIconRotation(guild.id, {
					enabled: !wasEnabled,
					...(!wasEnabled ? { lastRotationAt: new Date() } : {}),
				})
				await interaction.update(await buildServerIconPanel(guild, t))
				return
			}
			if (interaction.customId === `${SERVERICON_PANEL_PREFIX}refresh`) {
				await interaction.update(await buildServerIconPanel(guild, t))
				return
			}
		}

		if (interaction.isStringSelectMenu()) {
			if (interaction.customId === `${SERVERICON_PANEL_PREFIX}interval`) {
				const rawMinutes = interaction.values[0]
				const minutes = rawMinutes
					? Number.parseInt(rawMinutes, 10)
					: NaN
				const clamped = clampIntervalMinutes(
					Number.isFinite(minutes)
						? minutes
						: SERVER_ICON_DEFAULT_INTERVAL_MINUTES
				)
				await upsertServerIconRotation(guild.id, {
					intervalMinutes: clamped,
				})
				await interaction.update(await buildServerIconPanel(guild, t))
				return
			}
			if (interaction.customId === `${SERVERICON_PANEL_PREFIX}remove`) {
				const id = interaction.values[0]
				if (id) {
					const doc = await getServerIconRotation(guild.id)
					const entry = doc?.images.find((i) => i.id === id)
					if (entry) {
						try {
							await r2DeleteObject(entry.r2Key)
						} catch {
							/* continue */
						}
						await pullServerIconImageById(guild.id, id)
					}
				}
				await interaction.update(await buildServerIconPanel(guild, t))
				return
			}
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
