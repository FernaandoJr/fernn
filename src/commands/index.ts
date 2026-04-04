import { pingCommand } from "./general/ping/index.ts"
import { uptimeCommand } from "./general/uptime/index.ts"
import { banCommand } from "./moderation/ban/index.ts"
import { clearCommand } from "./moderation/clear/index.ts"
import { kickCommand } from "./moderation/kick/index.ts"
import { muteCommand } from "./moderation/mute/index.ts"
import { serverInfoCommand } from "./utility/serverInfo/index.ts"
import { userInfoCommand } from "./utility/userInfo/index.ts"

import type { SlashCommand } from "../types/command.ts"

export const commands: SlashCommand[] = [
	pingCommand,
	uptimeCommand,
	banCommand,
	kickCommand,
	muteCommand,
	clearCommand,
	userInfoCommand,
	serverInfoCommand,
]

export const commandMap = new Map(
	commands.map((command) => [command.data.name, command])
)

export const commandData = commands.map((command) => command.data.toJSON())
