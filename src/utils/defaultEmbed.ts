import { EmbedBuilder, type ColorResolvable } from "discord.js"

export const DEFAULT_EMBED_COLOR = 0x5865f2 as const

export type DefaultEmbedOptions = {
	title?: string
	description?: string
	color?: ColorResolvable
}

export function createDefaultEmbed(options?: DefaultEmbedOptions): EmbedBuilder {
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
