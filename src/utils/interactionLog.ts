import chalk from "chalk"
import type { ChatInputCommandInteraction } from "discord.js"

export const getInteractionServerLabel = (
	interaction: ChatInputCommandInteraction,
): string =>
	interaction.inGuild()
		? `${interaction.guild?.name ?? "Unknown guild"} (${interaction.guildId})`
		: "DM"

export const getInteractionAuthorLabel = (
	interaction: ChatInputCommandInteraction,
): string => `${interaction.user.tag} (${interaction.user.id})`

export const logChatCommandExecuted = (
	interaction: ChatInputCommandInteraction,
): void => {
	const serverLabel = getInteractionServerLabel(interaction)
	const authorLabel = getInteractionAuthorLabel(interaction)

	console.log(
		`${chalk.green("Executed")} ${chalk.white(`/${interaction.commandName}`)} ${chalk.dim(`| server: ${serverLabel} | author: ${authorLabel}`)}`,
	)
}

export const logChatCommandFailed = (
	interaction: ChatInputCommandInteraction,
	error: unknown,
): void => {
	const serverLabel = getInteractionServerLabel(interaction)
	const authorLabel = getInteractionAuthorLabel(interaction)

	console.error(
		`${chalk.redBright("Failed to execute")} ${chalk.white(`/${interaction.commandName}`)} ${chalk.dim(`| server: ${serverLabel} | author: ${authorLabel}`)}`,
		error,
	)
}
