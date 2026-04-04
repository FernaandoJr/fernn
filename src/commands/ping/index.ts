import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../../types/command.ts";

export const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether the bot is responding."),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("Pong!")
      .setDescription("The bot is online and responding.")
      .addFields(
        {
          name: "API Latency",
          value: `${Math.round(interaction.client.ws.ping)} ms`,
          inline: true,
        },
        {
          name: "Command",
          value: `/${interaction.commandName}`,
          inline: true,
        },
      )
      .setColor(0x5865f2)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
