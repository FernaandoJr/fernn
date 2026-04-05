import { EmbedBuilder, type ColorResolvable } from "discord.js"

import { colors } from "../constants/colors.ts"

export const DEFAULT_EMBED_COLOR = colors.primary

export type DefaultEmbedOptions = {
	title?: string
	description?: string
	color?: ColorResolvable
}

export function createDefaultEmbed(
	options?: DefaultEmbedOptions
): EmbedBuilder {
	const embed = new EmbedBuilder()
		.setColor(options?.color ?? DEFAULT_EMBED_COLOR)
		.setTimestamp()

	if (options?.title !== undefined) {
		embed.setTitle(options.title)
	}
	if (options?.description !== undefined) {
		embed.setDescription(options.description)
	}

	return embed
}

export function createLogEmbed(options?: DefaultEmbedOptions): EmbedBuilder {
	return createDefaultEmbed({
		...options,
		color: options?.color ?? colors.info,
	})
}
