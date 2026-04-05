import {
	type ChatInputCommandInteraction,
	InteractionContextType,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js"
import mongoose from "mongoose"

import { SERVER_ICON_R2_KEY_PREFIX } from "../../../constants/serverIcon.ts"
import {
	pushServerIconImage,
} from "../../../database/models/ServerIconRotation.ts"
import { buildServerIconPanel } from "../../../features/serverIcon/panel.ts"
import {
	downloadImageFromUrl,
	isServerIconAttachmentAcceptable,
	labelFromAttachmentFilename,
	normalizeServerIconForStorage,
	r2MetaForServerIconStorageKind,
	resolveServerIconStorageKind,
} from "../../../features/serverIcon/normalizeImage.ts"
import { getTranslator } from "../../../i18n/index.ts"
import { r2DeleteObject, r2PutImage } from "../../../storage/r2Client.ts"
import type { SlashCommand } from "../../../types/command.ts"

async function processServerIconAdd(
	interaction: ChatInputCommandInteraction,
	guildId: string,
	t: ReturnType<typeof getTranslator>
): Promise<{ ok: true } | { ok: false; message: string }> {
	const attachment = interaction.options.getAttachment("add-image", true)

	if (
		!isServerIconAttachmentAcceptable(
			attachment.contentType,
			attachment.name ?? ""
		)
	) {
		return { ok: false, message: t("errors.servericon.invalidImage") }
	}

	let raw: Buffer
	try {
		raw = await downloadImageFromUrl(attachment.url)
	} catch (error) {
		if (error instanceof Error && error.message === "IMAGE_TOO_LARGE") {
			return { ok: false, message: t("errors.servericon.imageTooLarge") }
		}
		return { ok: false, message: t("errors.servericon.invalidImage") }
	}

	const storageKind = resolveServerIconStorageKind(
		attachment.contentType,
		attachment.name ?? ""
	)
	const { ext, contentType } = r2MetaForServerIconStorageKind(storageKind)

	let body: Buffer
	try {
		body = await normalizeServerIconForStorage(raw, storageKind)
	} catch {
		return { ok: false, message: t("errors.servericon.invalidImage") }
	}

	const imageId = new mongoose.Types.ObjectId().toString()
	const r2Key = `${SERVER_ICON_R2_KEY_PREFIX}/${guildId}/${imageId}.${ext}`

	try {
		await r2PutImage(r2Key, body, contentType)
	} catch {
		return { ok: false, message: t("errors.servericon.storageUnavailable") }
	}

	try {
		await pushServerIconImage(guildId, {
			id: imageId,
			r2Key,
			addedByUserId: interaction.user.id,
			label: labelFromAttachmentFilename(attachment.name),
		})
	} catch (error) {
		try {
			await r2DeleteObject(r2Key)
		} catch {
			/* best effort */
		}
		if (error instanceof Error && error.message === "SERVER_ICON_MAX_IMAGES") {
			return { ok: false, message: t("errors.servericon.maxImages") }
		}
		throw error
	}

	return { ok: true }
}

export const serverIconCommand: SlashCommand = {
	data: new SlashCommandBuilder()
		.setName("server-icon")
		.setDescription(
			"Open the server icon library panel. Optionally attach an image to add it."
		)
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addAttachmentOption((o) =>
			o
				.setName("add-image")
				.setDescription(
					"Attach an image or GIF to add to the library (optional)."
				)
				.setRequired(false)
		),
	async execute(interaction) {
		const t = getTranslator(interaction.locale)
		const guild = interaction.guild
		if (!guild) {
			await interaction.reply({
				content: t("errors.servericon.guildOnly"),
				ephemeral: true,
			})
			return
		}

		const me = guild.members.me
		if (!me?.permissions.has(PermissionFlagsBits.ManageGuild)) {
			await interaction.reply({
				content: t("errors.servericon.botCannotManageGuild"),
				ephemeral: true,
			})
			return
		}

		const attachment = interaction.options.getAttachment("add-image")

		if (attachment) {
			await interaction.deferReply({ ephemeral: true })
			const result = await processServerIconAdd(interaction, guild.id, t)
			if (!result.ok) {
				await interaction.editReply({
					content: result.message,
					embeds: [],
					components: [],
				})
				return
			}

			await interaction.editReply({
				...(await buildServerIconPanel(guild, t)),
			})
			return
		}

		await interaction.reply({
			...(await buildServerIconPanel(guild, t)),
			ephemeral: true,
		})
	},
}
