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

const MAX_TIMEOUT_SECONDS = 2_419_200;

export const muteCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Timeout a member (Discord mute).")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The member to timeout")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("duration")
        .setDescription("Duration in seconds (max 28 days)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(MAX_TIMEOUT_SECONDS)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the timeout")
        .setRequired(false)
    ),
  async execute(interaction) {
    const t = getTranslator(interaction.locale);

    if (!(await replyIfNotInGuild(interaction))) {
      return;
    }

    const targetUser = interaction.options.getUser("member", true);
    const durationSeconds = interaction.options.getInteger("duration", true);
    const reason =
      interaction.options.getString("reason") ??
      t("commands.mute.noReasonProvided");
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
        "mute"
      ))
    ) {
      return;
    }

    const durationMs = durationSeconds * 1000;
    await targetMember!.timeout(durationMs, reason);

    const embed = createDefaultEmbed({
      title: t("commands.mute.title"),
      description: t("commands.mute.description", { target: targetUser.tag }),
    }).addFields(
      {
        name: t("commands.mute.fields.duration"),
        value: t("commands.mute.durationValue", {
          seconds: durationSeconds,
        }),
      },
      { name: t("commands.mute.fields.reason"), value: reason },
      {
        name: t("commands.mute.fields.moderator"),
        value: interaction.user.tag,
      },
    );

    await interaction.reply({ embeds: [embed] });
  },
};
