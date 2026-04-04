import { SlashCommandBuilder } from "discord.js";

import { getTranslator } from "../../i18n/index.ts";
import type { SlashCommand } from "../../types/command.ts";

export const helloCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("hello")
    .setDescription("Say hello world."),
  async execute(interaction) {
    const t = getTranslator(interaction.locale);

    await interaction.reply(t("commands.hello.reply"));
  },
};
