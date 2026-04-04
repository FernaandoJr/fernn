import { REST, Routes } from "discord.js";

import { commandData } from "./commands/index.ts";
import { config } from "./config.ts";

const rest = new REST({ version: "10" }).setToken(config.token);

const route = config.guildId
  ? Routes.applicationGuildCommands(config.clientId, config.guildId)
  : Routes.applicationCommands(config.clientId);

const scopeLabel = config.guildId
  ? `guild ${config.guildId}`
  : "global application";

console.log(`Deploying ${commandData.length} command(s) to ${scopeLabel}...`);

await rest.put(route, { body: commandData });

console.log("Command deployment complete.");
