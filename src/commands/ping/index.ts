import { SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../../types/command.ts";

export const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether the bot is responding."),
  async execute(interaction) {
    await interaction.reply("Pong!");
  },
};
