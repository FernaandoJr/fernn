import { helloCommand } from "./hello/index.ts";
import { pingCommand } from "./ping/index.ts";

import type { SlashCommand } from "../types/command.ts";

export const commands: SlashCommand[] = [helloCommand, pingCommand];

export const commandMap = new Map(
  commands.map((command) => [command.data.name, command]),
);

export const commandData = commands.map((command) => command.data.toJSON());
