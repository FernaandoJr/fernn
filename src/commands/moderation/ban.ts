import {
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { getTranslator } from "../../i18n/index.ts";
import type { SlashCommand } from "../../types/command.ts";
import { createDefaultEmbed } from "../../utils/defaultEmbed.ts";
import {
  ensureModerationTarget,
  replyIfNotInGuild,
  resolveMember,
} from "./guards.ts";

export const banCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user from this server.")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The user to ban")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the ban")
        .setRequired(true)
    ),
  async execute(interaction) {
    const t = getTranslator(interaction.locale);

    if (!(await replyIfNotInGuild(interaction))) {
      return;
    }

    const targetUser = interaction.options.getUser("member", true);
    const reason = interaction.options.getString("reason", true);
    const targetMember = await resolveMember(
      interaction,
      "member",
      targetUser
    );

    if (
      !(await ensureModerationTarget(
        interaction,
        targetUser,
        targetMember,
        "ban"
      ))
    ) {
      return;
    }

    const guild = interaction.guild!;

    if (targetMember) {
      await targetMember.ban({ reason });
    } else {
      await guild.bans.create(targetUser, { reason });
    }

    const embed = createDefaultEmbed({
      title: t("commands.ban.title"),
      description: t("commands.ban.description", { target: targetUser.tag }),
    }).addFields(
      { name: t("commands.ban.fields.reason"), value: reason },
      {
        name: t("commands.ban.fields.moderator"),
        value: interaction.user.tag,
      },
    );

    await interaction.reply({ embeds: [embed] });
  },
};
