# fernn

A simple, scalable Discord bot starter built with Bun, TypeScript, and `discord.js`.

## Docs

- Official docs: [discord.js](https://discord.js.org/)
- Core package docs: [discord.js main package](https://discord.js.org/docs/packages/discord.js/main)
- Slash command builder docs: [SlashCommandBuilder](https://discord.js.org/docs/packages/builders/1.0.0/SlashCommandBuilder:Class)

## Setup

1. Install dependencies:

```bash
bun install
```

2. Create a local env file from the example:

```bash
cp .env.example .env
```

3. Fill in:

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `MONGODB_URI` (MongoDB connection string; local or [Atlas](https://www.mongodb.com/cloud/atlas))
- `DISCORD_GUILD_ID` for fast guild-scoped development deployments

If `DISCORD_GUILD_ID` is omitted, command deployment falls back to global registration.

4. **Server logging** (`/serverlog`): In the [Discord Developer Portal](https://discord.com/developers/applications) → your app → **Bot**, enable **Privileged Gateway Intents** that match the features you need (at minimum **Server Members Intent** for join/leave, and ensure intents align with the bot code — see [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md)). Misconfigured intents cause a *disallowed intents* gateway error.

## Scripts

```bash
bun run start
bun run start:all
bun run dev
bun run deploy:commands
bun run typecheck
```

## Workflow

1. Register slash commands:

```bash
bun run deploy:commands
```

2. Start the bot:

```bash
bun run start
```

3. Use `/ping` in Discord.

Or run deploy + bot startup together:

```bash
bun run start:all
```

## Docker

Build the image:

```bash
docker build -t fernn-bot .
```

Run the bot with your local env file:

```bash
docker run --rm --env-file .env fernn-bot
```

Register commands from the container:

```bash
docker run --rm --env-file .env fernn-bot bun run deploy:commands
```

## Project structure

```text
src/
  commands/
  types/
  config.ts
  deploy-commands.ts
  index.ts
```

Each command lives in its own file and exports:

- `data` built with `SlashCommandBuilder`
- `execute()` to handle the interaction

This keeps adding new slash commands straightforward without rewriting the bot bootstrap or deploy flow.
