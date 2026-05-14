# Project Review — fernn Discord Bot

> Reviewed against discord.js v14, discordjs.guide patterns, and general TypeScript/Bun best practices.

---

## Overall Assessment

The codebase is well-structured, modular, and shows clear intent. Command pattern, i18n, and guard layers are solid. The main opportunities are around **resource lifecycle management**, **repeated mapping code**, and a few **fragile patterns** in guards and i18n resolution.

---

## Architecture Map

```
src/
  index.ts              — Client bootstrap, event routing
  config.ts             — Env validation
  deploy-commands.ts    — REST command registration

  commands/             — SlashCommand objects (data + execute)
    general/            — ping, ship, uptime
    moderation/         — ban, kick, mute, nickname, clear + guards.ts
    utility/            — serverIcon, serverInfo, serverLog, userInfo

  features/             — Stateful feature logic
    serverIcon/         — panel.ts, scheduler.ts, normalizeImage.ts
    serverLog/          — panel.ts, logChannel.ts, register.ts

  database/
    connect.ts
    models/             — ServerLogSettings, ServerIconRotation

  i18n/                 — i18next setup + 3 locales
  storage/              — r2Client.ts (Cloudflare R2 via AWS SDK)
  constants/            — colors, presenceCycle, serverIcon
  utils/                — defaultEmbed, interactionLog, startPresenceCycle
  types/                — command.ts (SlashCommand interface)
```

---

## What's Good

- **Command interface** (`SlashCommand`) is minimal and correct. `data + execute` is the pattern recommended by the discordjs.guide.
- **`commandMap` with `Map`** in `commands/index.ts` — O(1) lookup instead of `Array.find`.
- **`setContexts(InteractionContextType.Guild)` + `setDefaultMemberPermissions`** used consistently — Discord handles the permission check before the interaction even reaches the bot.
- **`guards.ts`** — centralizes guild-only enforcement and moderation preconditions cleanly.
- **`.lean().exec()` on all Mongoose reads** — returns plain objects, avoids hydration overhead.
- **`createDefaultEmbed` / `createLogEmbed`** — consistent embed construction.
- **`constants/serverIcon.ts`** — magic numbers extracted, clearly documented.
- **`normalizeImage.ts`** — image validation, MIME resolution, and Sharp pipeline are isolated from command logic.

---

## Issues & Improvements

### 1. Interval cleanup functions are never stored — resource leak

`startPresenceCycle` and `startServerIconRotationScheduler` both return `() => void` cleanup functions that `index.ts` ignores. These intervals will never be cleared if the client is destroyed or if a `SIGTERM` arrives.

```ts
// src/index.ts — current (discards return values)
startPresenceCycle(readyClient)
startServerIconRotationScheduler(readyClient)
```

**Fix:** store cleanup functions and hook `SIGINT`/`SIGTERM`.

```ts
let stopPresence: (() => void) | undefined
let stopScheduler: (() => void) | undefined

client.once(Events.ClientReady, (readyClient) => {
  stopPresence = startPresenceCycle(readyClient)
  stopScheduler = startServerIconRotationScheduler(readyClient)
})

process.once("SIGTERM", async () => {
  stopPresence?.()
  stopScheduler?.()
  await client.destroy()
  await mongoose.disconnect()
  process.exit(0)
})
```

---

### 2. Event listeners in `register.ts` have no error handling

`GuildMemberAdd`, `GuildMemberUpdate`, `VoiceStateUpdate`, and `MessageDelete` call `sendServerLogEmbed` (which does DB + REST) with no `try/catch`. An unhandled rejection here can crash the process in some environments.

```ts
// Risky — no try/catch
client.on(Events.GuildMemberAdd, async (member) => {
  await sendServerLogEmbed(...)   // DB + channel.send
})
```

**Fix:** wrap each async listener body in `try/catch` (or extract a helper like `safeLog`).

```ts
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    await sendServerLogEmbed(...)
  } catch {}
})
```

---

### 3. `toPlain` image mapping is duplicated four times in `ServerIconRotation.ts`

The same `doc.images.map((img) => ({ id, r2Key, ... }))` block is copy-pasted into `getServerIconRotation`, `upsertServerIconRotation`, `findEnabledServerIconRotations`, and `toPlain`. The `toPlain` helper exists for `Document` returns but lean results still inline-map.

**Fix:** define `mapImage` once and reuse everywhere.

```ts
const mapImage = (img: ServerIconImageEntry): ServerIconImageEntry => ({
  id: img.id,
  r2Key: img.r2Key,
  addedByUserId: img.addedByUserId,
  label: img.label ?? null,
  createdAt: img.createdAt,
})
```

---

### 4. `ensureModerationTarget` — string action union is fragile

The function uses `action: "ban" | "kick" | "mute" | "nickname"` with multiple `if (action !== "ban")` checks scattered through the body. Adding a new action (e.g. `"warn"`) requires auditing every conditional.

```ts
// guards.ts — today
if (action !== "nickname" && targetUser.id === interaction.user.id) { ... }
if (action !== "ban" && !targetMember) { ... }
if (action === "kick" && targetMember && !targetMember.kickable) { ... }
```

**Fix:** pass an options object describing what checks are needed, or split into smaller guard functions.

```ts
type ModerationGuardOptions = {
  allowSelf?: boolean
  requireMember?: boolean
  checkKickable?: boolean
  checkBannable?: boolean
  checkModeratable?: boolean
  checkManageable?: boolean
}
```

This makes each call-site explicit and removes conditional coupling inside the helper.

---

### 5. `resolveLocale` in `i18n/index.ts` has an unused variable and over-engineered flow

`supportedLocaleSet` is created but never used. The resolution logic also runs two full `.find()` passes (exact + language-only), which works fine but can be simplified since i18next already handles `fallbackLng` and can be configured with `nonExplicitSupportedLngs: true` to handle `pt` → `pt-BR` matching natively.

Additionally, `normalizeLocale` trims and lowercases, but `resolveLocale` is the only caller — the helper isn't needed standalone.

```ts
// Unused
const supportedLocaleSet = new Set<string>(supportedLngs)
```

**Minimal fix:** remove `supportedLocaleSet`, or delegate locale resolution entirely to i18next.

---

### 6. `setServerLogChannel` makes an extra DB read before upsert

```ts
// ServerLogSettings.ts
const existing = await getServerLogSettings(guildId)  // read 1
const events = existing ? mergeDefaultEvents(existing.events) : defaultEvents()
await ServerLogSettingsModel.findOneAndUpdate(...)      // read/write 2
```

The `$setOnInsert` operator on Mongoose can handle defaults on upsert without a prior read.

```ts
await ServerLogSettingsModel.findOneAndUpdate(
  { guildId },
  {
    $set: { channelId, enabled: true },
    $setOnInsert: { events: defaultEvents() },
  },
  { new: true, upsert: true }
)
```

---

### 7. Duplicate error-reply pattern in both panel handlers

Both `handleServerLogPanelInteraction` and `handleServerIconPanelInteraction` have the same 8-line block:

```ts
if (interaction.deferred || interaction.replied) {
  await interaction.followUp({ content: err, ephemeral: true }).catch(() => {})
} else {
  await interaction.reply({ content: err, ephemeral: true }).catch(() => {})
}
```

**Fix:** extract a shared utility.

```ts
async function safeEphemeralReply(
  interaction: MessageComponentInteraction,
  content: string
) {
  const payload = { content, ephemeral: true }
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload).catch(() => {})
  } else {
    await interaction.reply(payload).catch(() => {})
  }
}
```

---

### 8. `user.tag` throughout moderation embeds

`user.tag` still works in discord.js v14 but returns just `username` (no discriminator) for migrated accounts — making all moderation embed "Moderator" and "Target" fields show only the username with no discriminator context. Prefer `user.username` for clarity, or use `userMention(user.id)` for richer display.

---

### 9. `user.fetch()` called unconditionally in `userInfo`

```ts
const user = await member.user.fetch()  // REST call every invocation
```

This forces a REST round-trip on every `/user-info` call to get the banner/accent color. If neither banner nor accent color is displayed in the embed, this is wasted. Either remove it, or only call when you need `user.banner`.

---

### 10. `getInteractionServerLabel` and `getInteractionAuthorLabel` exported unnecessarily

These helpers are only used internally in `interactionLog.ts`. Exporting them widens the module surface with no consumer.

---

### 11. `resolveServerIconStorageKind` has a redundant final `return "png"`

```ts
if (mime.startsWith("image/")) {
  return "png"
}
return "png"   // unreachable — both branches return the same value
```

The last line is dead code; the `if` check above already covers all `image/*` types. Remove the block or consolidate.

---

### 12. `connectDatabase` has no error handling or reconnect strategy

```ts
export async function connectDatabase(): Promise<void> {
  await mongoose.connect(config.mongoUri)
}
```

If the initial connection fails, the error propagates to the top-level `await` in `index.ts` and crashes the process. Mongoose also does not automatically reconnect after a dropped connection by default in all configurations. Consider adding a `serverSelectionTimeoutMS` option and a `mongoose.connection.on('error', ...)` listener.

---

### 13. `deploy-commands.ts` hardcodes REST `version: "10"`

```ts
const rest = new REST({ version: "10" }).setToken(config.token)
```

discord.js v14 exports a pre-configured `REST` via `new REST()` that already defaults to the correct version. Pinning `"10"` manually can drift from what the library expects if the API version ever changes.

---

## Minor / Cosmetic

| File | Note |
|---|---|
| `normalizeImage.ts` | `IMAGE_FILENAME` regex is only used in one place — could be inlined |
| `index.ts` | `console.log` on startup — fine, but consider using `chalk` consistently (some places use it, some don't) |
| `serverInfo/index.ts` | `countGuildChannels` iterates all channels each call. `guild.channels.cache` is already in-memory so cost is low, but the function could use `reduce` to be more idiomatic |
| `presenceCycle.ts` | Hardcoded English strings. If i18n is desired for presence, externalize |

---

## Priority Order

| Priority | Item |
|---|---|
| High | Fix missing try/catch in `register.ts` event listeners |
| High | Store & call interval cleanup functions; add graceful shutdown |
| Medium | Extract `mapImage` helper in `ServerIconRotation.ts` |
| Medium | Fix `setServerLogChannel` double DB call |
| Medium | Refactor `ensureModerationTarget` action string |
| Low | Remove `supportedLocaleSet` / simplify `resolveLocale` |
| Low | Extract `safeEphemeralReply` from panel handlers |
| Low | Remove redundant `return "png"` in `resolveServerIconStorageKind` |
| Low | Remove unnecessary exports from `interactionLog.ts` |
| Low | Remove `REST version: "10"` pin in `deploy-commands.ts` |
