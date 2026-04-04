import type { SlashCommandOptionsOnlyBuilder } from "@discordjs/builders";
import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

export interface SlashCommand {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
