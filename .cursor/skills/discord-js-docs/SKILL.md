---
name: discord-js-docs
description: Ground discord.js work in official documentation and the discord.js GitHub organization before other sources. Use whenever implementing, debugging, or reviewing Discord bot code with discord.js or related @discordjs packages—slash commands, interactions, embeds, components, collectors, gateway, intents, REST, voice, builders, sharding, threads, permissions, rate limits, migrations, or choosing libraries in the ecosystem. Also use when the user asks for best practices, correct typings, or how an API behaves. After official docs and org repos do not answer the question, search the wider web and validate against current docs and the project’s discord.js major version.
---

# discord.js — official docs first

## Intent

Reduce outdated patterns and wrong APIs by consulting **discord.js** and **Discord** primary sources before tutorials or random search results.

## Workflow (in order)

1. **Match the major version** — Read the workspace `package.json` for `discord.js` (and `@discordjs/*`) versions. Prefer documentation and examples for that major line; call out breaking differences when mixing sources.
2. **API shape and behavior** — Use the official API docs at https://discord.js.org/ (package `discord.js` and related packages). Prefer method and option names from the reference over memory.
3. **How to build features correctly** — Use the Guide at https://discordjs.guide/ for end-to-end patterns, setup, and common recommendations.
4. **Source and ecosystem** — Use https://github.com/discordjs for implementation details, changelogs, and sibling packages (`builders`, `rest`, `voice`, `ws`, etc.).
5. **Platform rules** — For limits, intents, and raw HTTP or gateway behavior, use https://discord.com/developers/docs/ when discord.js docs point there or when the question is Discord-wide, not library-specific.
6. **If still unclear** — Search with `site:discord.js.org`, `site:discordjs.guide`, or `site:github.com/discordjs` first; then general web search. Reconcile any community answer against official docs and your pinned versions.

## Output expectations

When giving implementation advice, tie behavior to **official** APIs or Guide sections when possible. If relying on a secondary source, state that it should be verified against the current official docs for the project’s version.

## Reference

Canonical URLs, npm scope notes, and search patterns: [official-sources.md](references/official-sources.md).
