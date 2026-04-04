import { SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../../types/command.ts";

export const helloCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("hello")
    .setDescription("Say hello world."),
  async execute(interaction) {
    await interaction.reply("Hello world!");
  },
};
