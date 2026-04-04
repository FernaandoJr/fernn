# discord.js — official sources

Use this file when you need exact URLs or search patterns. Prefer these over blogs or unofficial wikis.

## Primary documentation

| Resource | URL | Use for |
|----------|-----|---------|
| API reference (main package) | https://discord.js.org/docs/packages/discord.js/main | Classes, methods, options types, enums, return values |
| discord.js Guide | https://discordjs.guide/ | Patterns, setup, commands, best practices, common pitfalls |
| discord.js repo | https://github.com/discordjs/discord.js | Source truth, examples in repo, issue search for edge cases |
| Guide repo | https://github.com/discordjs/guide | Guide content history, supplementary examples |
| Organization (all repos) | https://github.com/discordjs | Related packages: builders, rest, voice, collection, ws, etc. |

## npm scope (verify versions against the project’s package.json)

- Core: `discord.js` — https://www.npmjs.com/package/discord.js
- Common siblings: `@discordjs/builders`, `@discordjs/rest`, `@discordjs/voice`, `@discordjs/ws`, `@discordjs/formatters`, `discord-api-types` — search `https://www.npmjs.com/package/<name>` or browse the GitHub org.

## Targeted search (before generic web search)

Prefer site-restricted queries:

- `site:discord.js.org <topic>` — API and package docs
- `site:discordjs.guide <topic>` — tutorials and guides
- `site:github.com/discordjs <topic>` — issues, discussions, source

## Discord API (platform rules)

When behavior depends on Discord’s platform (intents, rate limits, message formats, application commands spec):

- Developer documentation — https://discord.com/developers/docs/

## When official docs are silent

1. Search GitHub issues in `discordjs/discord.js` (and the relevant package repo) for the class or error text.
2. Use broad web search for community solutions, then cross-check against current API docs and your installed major version (v14 vs v15, etc.).
