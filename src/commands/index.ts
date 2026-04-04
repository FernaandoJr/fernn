import { helloCommand } from "./general/hello.ts"
import { pingCommand } from "./general/ping.ts"
import { banCommand } from "./moderation/ban.ts"
import { clearCommand } from "./moderation/clear.ts"
import { kickCommand } from "./moderation/kick.ts"
import { muteCommand } from "./moderation/mute.ts"

import type { SlashCommand } from "../types/command.ts"

export const commands: SlashCommand[] = [
	helloCommand,
	pingCommand,
	banCommand,
	kickCommand,
	muteCommand,
	clearCommand,
]

export const commandMap = new Map(
	commands.map((command) => [command.data.name, command])
)

export const commandData = commands.map((command) => command.data.toJSON())
