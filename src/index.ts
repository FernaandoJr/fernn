import { Client, Events, GatewayIntentBits } from "discord.js";

import { config } from "./config.ts";
import { commandMap } from "./commands/index.ts";
import { getTranslator, initializeI18n } from "./i18n/index.ts";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const t = getTranslator(interaction.locale);
  const command = commandMap.get(interaction.commandName);

  if (!command) {
    await interaction.reply({
      content: t("errors.commandUnavailable"),
      ephemeral: true,
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Failed to execute /${interaction.commandName}`, error);

    const reply = {
      content: t("errors.commandExecutionFailed"),
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
      return;
    }

    await interaction.reply(reply);
  }
});

await initializeI18n();
await client.login(config.token);
