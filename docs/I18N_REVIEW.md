# i18n Review — fernn Discord Bot

> Sources: [discord.js API docs](https://discord.js.org/), [discordjs.guide — Advanced Command Creation](https://discordjs.guide/slash-commands/advanced-creation), [Discord Developer Docs — Localization](https://discord.com/developers/docs/interactions/application-commands#localization), community bots (Kozak-BOT, CuteNikki/discord-bot).

---

## Current Implementation Summary

| What | How |
|---|---|
| Library | i18next + `getFixedT` |
| Locales | `en`, `es`, `pt-BR` |
| Structure | single `common.json` per locale |
| Resolution | manual `resolveLocale()` on `interaction.locale` |
| Command metadata | English-only (`setName`, `setDescription` hardcoded) |
| Guild vs user locale | always `interaction.locale` (user's client language) |

---

## Issues Found

### 1. The `"es"` locale key is a latent mismatch

Discord sends `interaction.locale` as a BCP-47 tag. Spanish is `"es-ES"`, not `"es"`. The current resources object uses `"es"` as key, so the lookup only resolves correctly because `resolveLocale` has a language-only fallback (`"es-ES"` → strip `-ES` → `"es"`). **It works by accident**, not by design.

discord.js exports a typed `Locale` enum with every Discord locale:

```ts
import { Locale } from "discord.js"
// Locale.SpanishES  → "es-ES"
// Locale.PortugueseBR → "pt-BR"
// Locale.EnglishUS  → "en-US"
```

The resources keys should match these exactly so no fallback gymnastics are needed.

---

### 2. Zero command metadata localization

Every command shows its English name and description in Discord's slash command picker regardless of the user's language. discord.js v14 supports this natively via `setNameLocalizations` and `setDescriptionLocalizations`:

```ts
new SlashCommandBuilder()
  .setName("ban")
  .setDescription("Ban a user from this server.")
  .setNameLocalizations({
    "es-ES": "banear",
    "pt-BR": "banir",
  })
  .setDescriptionLocalizations({
    "es-ES": "Banea a un usuario del servidor.",
    "pt-BR": "Bane um usuário do servidor.",
  })
```

Discord renders the localized name/description natively in the command picker. Not using this means Spanish and Portuguese users see English command names and descriptions — a degraded UX the framework already solves for free.

---

### 3. Always using `interaction.locale` (user locale) — wrong for guild management commands

`interaction.locale` is the user's Discord client language. `interaction.guildLocale` is the server's configured language.

For a command like `/ban` or `/server-log`, the correct language is the **server's language**, not the admin's client language. An English-speaking admin managing a Portuguese server should see responses in Portuguese.

| Command category | Correct locale source |
|---|---|
| `general/` (ping, ship, uptime, user-info) | `interaction.locale` — personal, user-facing |
| `moderation/` (ban, kick, mute, etc.) | `interaction.guildLocale` — affects the server |
| `utility/serverlog`, `utility/servericon` | `interaction.guildLocale` — server configuration |
| `utility/serverinfo` | `interaction.guildLocale` — describes the server |
| Event listeners in `register.ts` | `guild.preferredLocale` ✅ (already correct) |

The event listeners in `register.ts` already use `guild.preferredLocale` (which is what `guildLocale` maps to). The slash commands do not.

---

### 4. i18next provides features the bot doesn't use

The bot uses from i18next:
- `getFixedT` — namespaced lookup
- String interpolation (`{{ key }}`)
- `returnObjects: true` — one place (ship command tier messages)

Everything else (plurals, formatters, plugins, namespaces beyond one, language detector, react integration) is unused. i18next is ~35KB gzipped and initializes asynchronously even though all resources are bundled statically.

**This is not a blocker** — i18next is reliable and the overhead is negligible for a bot. But it's worth knowing that 95% of it is idle.

---

### 5. `resolveLocale` is still doing unnecessary work

After using the `Locale` enum as keys, the resolution logic becomes a direct `Map` lookup with no fuzzy matching needed. The current two-pass `find()` can be replaced entirely.

---

## Recommended Changes

### A — Use `Locale` enum as resource keys

```ts
// i18n/index.ts
import { Locale } from "discord.js"

const resources = {
  [Locale.EnglishUS]: { common: enCommon },
  [Locale.SpanishES]: { common: esCommon },
  [Locale.PortugueseBR]: { common: ptBrCommon },
} as const

const SUPPORTED = new Set(Object.keys(resources))

export const resolveLocale = (locale?: string | null): string =>
  locale && SUPPORTED.has(locale) ? locale : Locale.EnglishUS
```

No more two-pass fuzzy matching. Direct O(1) lookup. The fallback is explicit.

> **Note:** This changes the default from `"en"` to `"en-US"`. i18next `lng` and `fallbackLng` should be updated to `Locale.EnglishUS`.

---

### B — Add `setNameLocalizations` / `setDescriptionLocalizations` to commands

The locale JSON files are already statically imported in `i18n/index.ts`. A small helper reads directly from those imports — no translator passed as argument, no dynamic key building:

```ts
// i18n/localizations.ts
import { Locale } from "discord.js"
import esCommon from "./locales/es-ES/common.json"
import ptBrCommon from "./locales/pt-BR/common.json"

type CommonKey = keyof typeof esCommon

export function nameLocalizations(key: CommonKey) {
  return {
    [Locale.SpanishES]: esCommon[key],
    [Locale.PortugueseBR]: ptBrCommon[key],
  } as const
}
```

Usage in any command builder — clean and statically typed:

```ts
new SlashCommandBuilder()
  .setName("ban")
  .setNameLocalizations(nameLocalizations("banName"))
  .setDescription("Ban a user from this server.")
  .setDescriptionLocalizations(nameLocalizations("banDescription"))
```

> **Requires adding `banName`, `banDescription`, etc. to each locale JSON** — keys that don't exist today.

---

### C — Always use `interaction.locale`

Always use the invoking user's locale. No `guildLocale`, no fallback chain.

```ts
const t = getTranslator(interaction.locale)
```

---

## Summary Table

| Issue | Severity | Fix |
|---|---|---|
| `"es"` key doesn't match Discord's `"es-ES"` | Medium | Use `Locale` enum as keys |
| No command metadata localization | Medium | `setNameLocalizations` + `setDescriptionLocalizations` |
| User locale used for guild commands | Medium | `guildLocale` for moderation/utility/serverlog/servericon |
| Two-pass fuzzy `resolveLocale` | Low | Direct `Set.has()` after fixing keys |
| i18next overkill | Info | Acceptable — no action required unless bundle size matters |

---

---

## Flat JSON Refactor Plan

### Convention

- **One level only** — no nested objects
- **Keys are camelCase phrases** describing the string's meaning
- **Prefix groups logically** by feature: `error`, `ping`, `ban`, `serverlog`, `servericon`, `ship`, etc.
- **No arrays** — ship tier messages migrate to indexed keys (`shipVeryLow0 … shipVeryLow8`); count exported as a TS constant

---

### Key Mapping — old → new

#### Errors

| Old path | New key |
|---|---|
| `errors.commandUnavailable` | `errorCommandUnavailable` |
| `errors.commandExecutionFailed` | `errorCommandFailed` |
| `errors.moderation.guildOnly` | `errorGuildOnly` |
| `errors.moderation.memberNotInGuild` | `errorMemberNotInGuild` |
| `errors.moderation.cannotModerateSelf` | `errorCannotModerateSelf` |
| `errors.moderation.cannotModerateOwner` | `errorCannotModerateOwner` |
| `errors.moderation.cannotModerateBot` | `errorCannotModerateBot` |
| `errors.moderation.targetNotBannable` | `errorTargetNotBannable` |
| `errors.moderation.targetNotKickable` | `errorTargetNotKickable` |
| `errors.moderation.targetNotModeratable` | `errorTargetNotModeratable` |
| `errors.moderation.targetNotNicknamable` | `errorTargetNotNicknamable` |
| `errors.moderation.clearNotTextChannel` | `errorClearNotTextChannel` |
| `errors.moderation.clearFailed` | `errorClearFailed` |
| `errors.userInfo.notMember` | `errorUserNotMember` |
| `errors.ship.sameUser` | `errorShipSameUser` |
| `errors.serverlog.invalidChannel` | `errorServerlogInvalidChannel` |
| `errors.serverlog.noPermission` | `errorServerlogNoPermission` |
| `errors.servericon.guildOnly` | `errorServericonGuildOnly` |
| `errors.servericon.storageUnavailable` | `errorServericonStorageUnavailable` |
| `errors.servericon.invalidImage` | `errorServericonInvalidImage` |
| `errors.servericon.imageTooLarge` | `errorServericonImageTooLarge` |
| `errors.servericon.maxImages` | `errorServericonMaxImages` |
| `errors.servericon.invalidId` | `errorServericonInvalidId` |
| `errors.servericon.notFound` | `errorServericonNotFound` |
| `errors.servericon.botCannotManageGuild` | `errorServericonBotCannotManage` |
| `errors.servericon.noPanelPermission` | `errorServericonNoPanelPermission` |

#### Ping / Uptime

| Old path | New key |
|---|---|
| `commands.ping.title` | `pingTitle` |
| `commands.ping.description` | `pingDescription` |
| `commands.ping.fields.apiLatency` | `pingFieldApiLatency` |
| `commands.ping.fields.command` | `pingFieldCommand` |
| `commands.uptime.title` | `uptimeTitle` |
| `commands.uptime.description` | `uptimeDescription` |
| `commands.uptime.fields.process` | `uptimeFieldProcess` |

#### Moderation

| Old path | New key |
|---|---|
| `commands.ban.title` | `banTitle` |
| `commands.ban.description` | `banDescription` |
| `commands.ban.fields.reason` | `banFieldReason` |
| `commands.ban.fields.moderator` | `banFieldModerator` |
| `commands.kick.title` | `kickTitle` |
| `commands.kick.description` | `kickDescription` |
| `commands.kick.fields.reason` | `kickFieldReason` |
| `commands.kick.fields.moderator` | `kickFieldModerator` |
| `commands.mute.title` | `muteTitle` |
| `commands.mute.description` | `muteDescription` |
| `commands.mute.noReasonProvided` | `muteNoReason` |
| `commands.mute.durationValue` | `muteDuration` |
| `commands.mute.fields.duration` | `muteFieldDuration` |
| `commands.mute.fields.reason` | `muteFieldReason` |
| `commands.mute.fields.moderator` | `muteFieldModerator` |
| `commands.nickname.title` | `nicknameTitle` |
| `commands.nickname.description` | `nicknameDescription` |
| `commands.nickname.noNickname` | `nicknameNoNickname` |
| `commands.nickname.noReasonProvided` | `nicknameNoReason` |
| `commands.nickname.fields.before` | `nicknameFieldBefore` |
| `commands.nickname.fields.after` | `nicknameFieldAfter` |
| `commands.nickname.fields.reason` | `nicknameFieldReason` |
| `commands.nickname.fields.moderator` | `nicknameFieldModerator` |
| `commands.clear.title` | `clearTitle` |
| `commands.clear.description` | `clearDescription` |
| `commands.clear.fields.moderator` | `clearFieldModerator` |

#### User Info

| Old path | New key |
|---|---|
| `commands.userInfo.noBadges` | `userInfoNoBadges` |
| `commands.userInfo.noNickname` | `userInfoNoNickname` |
| `commands.userInfo.noRoles` | `userInfoNoRoles` |
| `commands.userInfo.unknown` | `userInfoUnknown` |
| `commands.userInfo.rolesMore` | `userInfoRolesMore` |
| `commands.userInfo.fields.badges` | `userInfoFieldBadges` |
| `commands.userInfo.fields.nickname` | `userInfoFieldNickname` |
| `commands.userInfo.fields.id` | `userInfoFieldId` |
| `commands.userInfo.fields.joined` | `userInfoFieldJoined` |
| `commands.userInfo.fields.created` | `userInfoFieldCreated` |
| `commands.userInfo.fields.roles` | `userInfoFieldRoles` |

#### Server Info

| Old path | New key |
|---|---|
| `commands.serverInfo.channelSummary` | `serverInfoChannelSummary` |
| `commands.serverInfo.boostSummary` | `serverInfoBoostSummary` |
| `commands.serverInfo.verification.none` | `serverInfoVerificationNone` |
| `commands.serverInfo.verification.low` | `serverInfoVerificationLow` |
| `commands.serverInfo.verification.medium` | `serverInfoVerificationMedium` |
| `commands.serverInfo.verification.high` | `serverInfoVerificationHigh` |
| `commands.serverInfo.verification.veryHigh` | `serverInfoVerificationVeryHigh` |
| `commands.serverInfo.explicitFilter.disabled` | `serverInfoFilterDisabled` |
| `commands.serverInfo.explicitFilter.membersWithoutRoles` | `serverInfoFilterMembersWithoutRoles` |
| `commands.serverInfo.explicitFilter.allMembers` | `serverInfoFilterAllMembers` |
| `commands.serverInfo.premiumTier.none` | `serverInfoBoostTierNone` |
| `commands.serverInfo.premiumTier.tier1` | `serverInfoBoostTier1` |
| `commands.serverInfo.premiumTier.tier2` | `serverInfoBoostTier2` |
| `commands.serverInfo.premiumTier.tier3` | `serverInfoBoostTier3` |
| `commands.serverInfo.fields.id` | `serverInfoFieldId` |
| `commands.serverInfo.fields.owner` | `serverInfoFieldOwner` |
| `commands.serverInfo.fields.created` | `serverInfoFieldCreated` |
| `commands.serverInfo.fields.members` | `serverInfoFieldMembers` |
| `commands.serverInfo.fields.channels` | `serverInfoFieldChannels` |
| `commands.serverInfo.fields.boost` | `serverInfoFieldBoost` |
| `commands.serverInfo.fields.verification` | `serverInfoFieldVerification` |
| `commands.serverInfo.fields.explicitFilter` | `serverInfoFieldExplicitFilter` |

#### Server Log

| Old path | New key |
|---|---|
| `commands.serverlog.disable.success` | `serverlogDisableSuccess` |
| `commands.serverlog.panel.selectChannel` | `serverlogPanelSelectChannel` |
| `commands.serverlog.panel.selectCategories` | `serverlogPanelSelectCategories` |
| `commands.serverlog.panel.disableButton` | `serverlogPanelDisableButton` |
| `commands.serverlog.panel.options.voice` | `serverlogPanelOptionVoice` |
| `commands.serverlog.panel.options.members` | `serverlogPanelOptionMembers` |
| `commands.serverlog.panel.options.moderation` | `serverlogPanelOptionModeration` |
| `commands.serverlog.panel.options.messages` | `serverlogPanelOptionMessages` |
| `commands.serverlog.logs.noReason` | `serverlogNoReason` |
| `commands.serverlog.logs.unknownAuthor` | `serverlogUnknownAuthor` |
| `commands.serverlog.logs.voiceJoin.title` | `serverlogVoiceJoinTitle` |
| `commands.serverlog.logs.voiceJoin.description` | `serverlogVoiceJoinDescription` |
| `commands.serverlog.logs.voiceLeave.title` | `serverlogVoiceLeaveTitle` |
| `commands.serverlog.logs.voiceLeave.description` | `serverlogVoiceLeaveDescription` |
| `commands.serverlog.logs.voiceMove.title` | `serverlogVoiceMoveTitle` |
| `commands.serverlog.logs.voiceMove.description` | `serverlogVoiceMoveDescription` |
| `commands.serverlog.logs.memberJoin.title` | `serverlogMemberJoinTitle` |
| `commands.serverlog.logs.memberJoin.description` | `serverlogMemberJoinDescription` |
| `commands.serverlog.logs.memberLeave.title` | `serverlogMemberLeaveTitle` |
| `commands.serverlog.logs.memberLeave.description` | `serverlogMemberLeaveDescription` |
| `commands.serverlog.logs.memberUpdate.title` | `serverlogMemberUpdateTitle` |
| `commands.serverlog.logs.memberUpdate.description` | `serverlogMemberUpdateDescription` |
| `commands.serverlog.logs.memberUpdate.noNickname` | `serverlogMemberUpdateNoNickname` |
| `commands.serverlog.logs.memberUpdate.nickname` | `serverlogMemberUpdateNickname` |
| `commands.serverlog.logs.memberUpdate.rolesAdded` | `serverlogMemberUpdateRolesAdded` |
| `commands.serverlog.logs.memberUpdate.rolesRemoved` | `serverlogMemberUpdateRolesRemoved` |
| `commands.serverlog.logs.memberUpdate.serverProfileAvatar` | `serverlogMemberUpdateAvatar` |
| `commands.serverlog.logs.modKick.title` | `serverlogModKickTitle` |
| `commands.serverlog.logs.modKick.description` | `serverlogModKickDescription` |
| `commands.serverlog.logs.modBan.title` | `serverlogModBanTitle` |
| `commands.serverlog.logs.modBan.description` | `serverlogModBanDescription` |
| `commands.serverlog.logs.modUnban.title` | `serverlogModUnbanTitle` |
| `commands.serverlog.logs.modUnban.description` | `serverlogModUnbanDescription` |
| `commands.serverlog.logs.modTimeout.title` | `serverlogModTimeoutTitle` |
| `commands.serverlog.logs.modTimeout.description` | `serverlogModTimeoutDescription` |
| `commands.serverlog.logs.messageDelete.title` | `serverlogMessageDeleteTitle` |
| `commands.serverlog.logs.messageDelete.description` | `serverlogMessageDeleteDescription` |
| `commands.serverlog.logs.messageBulk.title` | `serverlogMessageBulkTitle` |
| `commands.serverlog.logs.messageBulk.description` | `serverlogMessageBulkDescription` |

#### Server Icon

| Old path | New key |
|---|---|
| `commands.servericon.panel.title` | `servericonPanelTitle` |
| `commands.servericon.panel.noLabel` | `servericonPanelNoLabel` |
| `commands.servericon.panel.selectInterval` | `servericonPanelSelectInterval` |
| `commands.servericon.panel.intervalMinutes` | `servericonPanelIntervalMinutes` |
| `commands.servericon.panel.buttonToggleWhenOff` | `servericonPanelToggleOff` |
| `commands.servericon.panel.buttonToggleWhenOn` | `servericonPanelToggleOn` |
| `commands.servericon.panel.removePlaceholder` | `servericonPanelRemovePlaceholder` |
| `commands.servericon.panel.buttonRefresh` | `servericonPanelRefresh` |
| `commands.servericon.panel.embed.rotationOn` | `servericonPanelRotationOn` |
| `commands.servericon.panel.embed.rotationOff` | `servericonPanelRotationOff` |
| `commands.servericon.panel.embed.intervalLine` | `servericonPanelIntervalLine` |
| `commands.servericon.panel.embed.libraryLine` | `servericonPanelLibraryLine` |
| `commands.servericon.panel.embed.imagesSection` | `servericonPanelImagesSection` |
| `commands.servericon.panel.embed.imageLine` | `servericonPanelImageLine` |
| `commands.servericon.panel.embed.noImages` | `servericonPanelNoImages` |
| `commands.servericon.panel.embed.hint` | `servericonPanelHint` |

#### Ship — tier messages as flat array keys in `common.json`

UI strings stay flat. Tier messages also stay in `common.json` as flat top-level array values — no nesting, no numbered keys, no separate namespace.

| Old | New |
|---|---|
| `commands.ship.title` | `shipTitle` |
| `commands.ship.description` | `shipDescription` |
| `commands.ship.pairSeparator` | `shipPairSeparator` |
| `commands.ship.fallbackVerdict` | `shipFallbackVerdict` |
| `commands.ship.fields.score` | `shipFieldScore` |
| `commands.ship.fields.verdict` | `shipFieldVerdict` |
| `commands.ship.tiers.veryLow.messages` | `shipVeryLow` |
| `commands.ship.tiers.low.messages` | `shipLow` |
| `commands.ship.tiers.mid.messages` | `shipMid` |
| `commands.ship.tiers.high.messages` | `shipHigh` |

```json
{
  "shipVeryLow": ["Ice cold. Maybe try a group chat first.", "..."],
  "shipLow":     ["Slow burn — very slow.", "..."],
  "shipMid":     ["Solid maybe energy.", "..."],
  "shipHigh":    ["Canon energy.", "..."]
}
```

**`shipPair.ts` — key map lives alongside the tier logic:**
```ts
export const SHIP_TIER_MESSAGE_KEY: Record<ShipTierKey, string> = {
  veryLow: "shipVeryLow",
  low:     "shipLow",
  mid:     "shipMid",
  high:    "shipHigh",
}
```

**`ship/index.ts`:**
```ts
const messages = t(SHIP_TIER_MESSAGE_KEY[tierKey], { returnObjects: true }) as string[]
const idx = shipMessageIndex(pairKey, tierKey, messages.length)
const verdict = messages[idx] ?? t("shipFallbackVerdict")
```

The key is explicit, statically typed, and colocated with the tier definition. No dynamic string construction, no `isStringArray` guard.

---

### Benefits

| Before | After |
|---|---|
| 3–4 levels of nesting | 1 level flat |
| Arrays require `returnObjects: true` | Plain string keys only |
| Finding a key requires opening the JSON | Key name describes the string |
| `t("commands.serverlog.logs.modBan.title")` | `t("serverlogModBanTitle")` |
| Adding a key requires matching nesting exactly | Append at end of file |

---

## What Other Bots Do

| Bot | Library | Pattern |
|---|---|---|
| Kozak-BOT | i18next | `resources.ts` with locale subdirs, `interaction.locale` |
| CuteNikki/discord-bot | i18next | Per-guild language setting in DB, `interaction.locale` as fallback |
| @sapphire/plugin-i18next | i18next | `guildLocale` + `userLocale` both exposed, guild wins |
| TSCord | typesafe-i18n | Fully typed, `getLocaleFromInteraction()` pulls `guildLocale` |
| @robojs/i18n | MessageFormat 2 | Accepts `{ locale }` or `{ guildLocale }`, guild wins |

**Pattern consensus:** mature bots prefer `guildLocale` for server commands and fall back to `userLocale`. None skip `setNameLocalizations` if they support multiple languages.
