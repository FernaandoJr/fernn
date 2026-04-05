/** Max images per guild in the rotation library. */
export const SERVER_ICON_MAX_IMAGES = 15

/** Max length for optional image label (e.g. from attachment filename). */
export const SERVER_ICON_MAX_LABEL_LENGTH = 50

/** Min rotation interval (minutes). Lower values may hit Discord rate limits. */
export const SERVER_ICON_MIN_INTERVAL_MINUTES = 5

export const SERVER_ICON_MAX_INTERVAL_MINUTES = 10_080

/** Default when a guild enables rotation without setting interval. */
export const SERVER_ICON_DEFAULT_INTERVAL_MINUTES = 5

/** Max attachment size before Sharp (bytes). */
export const SERVER_ICON_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

/** Target width/height for stored server icon assets (Discord icon max). */
export const SERVER_ICON_TARGET_PIXEL_SIZE = 1024

/** Scheduler tick (ms). */
export const SERVER_ICON_SCHEDULER_TICK_MS = 60_000

/** R2 object key prefix for stored icons (`{prefix}/{guildId}/{id}.{ext}`). */
export const SERVER_ICON_R2_KEY_PREFIX = "server-icons"
