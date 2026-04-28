import { REST, Routes } from "discord.js";

import { commandData } from "./commands/index.ts";
import { config } from "./config.ts";

const rest = new REST({ version: "10" }).setToken(config.token);

if (config.guildId) {
	const guildRoute = Routes.applicationGuildCommands(
		config.clientId,
		config.guildId,
	);
	console.log(`Clearing guild slash commands for guild ${config.guildId}...`);
	await rest.put(guildRoute, { body: [] });
}

const route = config.deployGlobally
	? Routes.applicationCommands(config.clientId)
	: Routes.applicationGuildCommands(config.clientId, config.guildId!);

const scopeLabel = config.deployGlobally
	? "global application"
	: `guild ${config.guildId}`;

console.log(`Deploying ${commandData.length} command(s) to ${scopeLabel}...`);

await rest.put(route, { body: commandData });

console.log("Command deployment complete.");
