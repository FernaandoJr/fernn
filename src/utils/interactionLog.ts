import chalk from "chalk"
import type { ChatInputCommandInteraction } from "discord.js"

function serverLabel(interaction: ChatInputCommandInteraction): string {
	return interaction.inGuild()
		? `${interaction.guild?.name ?? "Unknown guild"} (${interaction.guildId})`
		: "DM"
}

function authorLabel(interaction: ChatInputCommandInteraction): string {
	return `${interaction.user.username} (${interaction.user.id})`
}

export const logChatCommandExecuted = (
	interaction: ChatInputCommandInteraction,
): void => {
	console.log(
		`${chalk.green("Executed")} ${chalk.white(`/${interaction.commandName}`)} ${chalk.dim(`| server: ${serverLabel(interaction)} | author: ${authorLabel(interaction)}`)}`,
	)
}

export const logChatCommandFailed = (
	interaction: ChatInputCommandInteraction,
	error: unknown,
): void => {
	console.error(
		`${chalk.redBright("Failed to execute")} ${chalk.white(`/${interaction.commandName}`)} ${chalk.dim(`| server: ${serverLabel(interaction)} | author: ${authorLabel(interaction)}`)}`,
		error,
	)
}
