import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

import { getTranslator } from "../../i18n/index.ts";
import type { SlashCommand } from "../../types/command.ts";

export const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether the bot is responding."),
  async execute(interaction) {
    const t = getTranslator(interaction.locale);
    const embed = new EmbedBuilder()
      .setTitle(t("commands.ping.title"))
      .setDescription(t("commands.ping.description"))
      .addFields(
        {
          name: t("commands.ping.fields.apiLatency"),
          value: `${Math.round(interaction.client.ws.ping)} ms`,
          inline: true,
        },
        {
          name: t("commands.ping.fields.command"),
          value: `/${interaction.commandName}`,
          inline: true,
        },
      )
      .setColor(0x5865f2)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
