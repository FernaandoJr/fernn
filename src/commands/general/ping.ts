import { SlashCommandBuilder } from "discord.js";

import { getTranslator } from "../../i18n/index.ts";
import type { SlashCommand } from "../../types/command.ts";
import { createDefaultEmbed } from "../../utils/defaultEmbed.ts";

export const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether the bot is responding."),
  async execute(interaction) {
    const t = getTranslator(interaction.locale);
    const embed = createDefaultEmbed({
      title: t("commands.ping.title"),
      description: t("commands.ping.description"),
    }).addFields(
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
    );

    await interaction.reply({ embeds: [embed] });
  },
};
