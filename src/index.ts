import chalk from "chalk"
import { Client, Events, GatewayIntentBits } from "discord.js"

import { commandMap } from "./commands/index.ts"
import { config } from "./config.ts"
import { connectDatabase } from "./database/connect.ts"
import {
	handleServerLogPanelInteraction,
	SERVERLOG_PANEL_PREFIX,
} from "./features/serverLog/panel.ts"
import { registerServerLogListeners } from "./features/serverLog/register.ts"
import { getTranslator, initializeI18n } from "./i18n/index.ts"
import {
	logChatCommandExecuted,
	logChatCommandFailed,
} from "./utils/interactionLog.ts"
import { startPresenceCycle } from "./utils/startPresenceCycle.ts"

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildMessages,
	],
})

client.once(Events.ClientReady, (readyClient) => {
	console.log(
		`${chalk.cyan("Logged in as")} ${chalk.white(readyClient.user.tag)}`
	)
	startPresenceCycle(readyClient)
})

client.on(Events.InteractionCreate, async (interaction) => {
	if (
		(interaction.isStringSelectMenu() ||
			interaction.isChannelSelectMenu() ||
			interaction.isButton()) &&
		interaction.customId?.startsWith(SERVERLOG_PANEL_PREFIX)
	) {
		try {
			await handleServerLogPanelInteraction(interaction)
		} catch (error) {
			console.error(error)
		}
		return
	}

	if (!interaction.isChatInputCommand()) {
		return
	}

	const t = getTranslator(interaction.locale)
	const command = commandMap.get(interaction.commandName)

	if (!command) {
		await interaction.reply({
			content: t("errors.commandUnavailable"),
			ephemeral: true,
		})
		return
	}

	try {
		await command.execute(interaction)
		logChatCommandExecuted(interaction)
	} catch (error) {
		logChatCommandFailed(interaction, error)

		const reply = {
			content: t("errors.commandExecutionFailed"),
			ephemeral: true,
		}

		if (interaction.replied || interaction.deferred) {
			await interaction.followUp(reply)
			return
		}

		await interaction.reply(reply)
	}
})

await initializeI18n()
await connectDatabase()
registerServerLogListeners(client)
await client.login(config.token)
