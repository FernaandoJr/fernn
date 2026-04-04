import type {
	SlashCommandOptionsOnlyBuilder,
	SlashCommandSubcommandsOnlyBuilder,
} from "@discordjs/builders";
import type {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";

export interface SlashCommand {
	data:
		| SlashCommandBuilder
		| SlashCommandOptionsOnlyBuilder
		| SlashCommandSubcommandsOnlyBuilder;
	execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
