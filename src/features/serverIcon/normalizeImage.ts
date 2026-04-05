import sharp from "sharp"
import type { SharpOptions } from "sharp"

import {
	SERVER_ICON_MAX_ATTACHMENT_BYTES,
	SERVER_ICON_MAX_LABEL_LENGTH,
	SERVER_ICON_TARGET_PIXEL_SIZE,
} from "../../constants/serverIcon.ts"

const IMAGE_FILENAME =
	/\.(gif|png|jpe?g|webp)$/i

export type ServerIconStorageKind = "png" | "gif" | "jpeg" | "webp"

const R2_META_BY_KIND: Record<
	ServerIconStorageKind,
	{ ext: string; contentType: string }
> = {
	gif: { ext: "gif", contentType: "image/gif" },
	jpeg: { ext: "jpg", contentType: "image/jpeg" },
	webp: { ext: "webp", contentType: "image/webp" },
	png: { ext: "png", contentType: "image/png" },
}

/** MIME primary type (strip parameters), lowercased. */
function primaryMimeType(contentType: string | null): string {
	return contentType?.toLowerCase().split(";")[0]?.trim() ?? ""
}

const MIME_TO_KIND: Partial<Record<string, ServerIconStorageKind>> = {
	"image/gif": "gif",
	"image/png": "png",
	"image/jpeg": "jpeg",
	"image/jpg": "jpeg",
	"image/webp": "webp",
}

/** Longer suffixes first so `.jpeg` wins over `.jpg` overlap cases. */
const FILENAME_SUFFIX_TO_KIND: ReadonlyArray<
	[suffix: string, kind: ServerIconStorageKind]
> = [
	[".jpeg", "jpeg"],
	[".jpg", "jpeg"],
	[".webp", "webp"],
	[".gif", "gif"],
	[".png", "png"],
]

function serverIconSized(input: Buffer, inputOptions: SharpOptions) {
	const px = SERVER_ICON_TARGET_PIXEL_SIZE
	return sharp(input, inputOptions)
		.rotate()
		.resize(px, px, { fit: "cover" })
}

export async function downloadImageFromUrl(url: string): Promise<Buffer> {
	const res = await fetch(url)
	if (!res.ok) {
		throw new Error(`Image download failed: ${res.status}`)
	}
	const buf = Buffer.from(await res.arrayBuffer())
	if (buf.length > SERVER_ICON_MAX_ATTACHMENT_BYTES) {
		throw new Error("IMAGE_TOO_LARGE")
	}
	return buf
}

/** True if `contentType` is image/* or filename looks like a raster image (e.g. GIF when Discord omits MIME). */
export function isServerIconAttachmentAcceptable(
	contentType: string | null,
	filename: string
): boolean {
	const mime = primaryMimeType(contentType)
	if (mime.startsWith("image/")) {
		return true
	}
	return IMAGE_FILENAME.test(filename)
}

/** Pick output format from attachment MIME or filename (defaults to PNG). */
export function resolveServerIconStorageKind(
	contentType: string | null,
	filename: string
): ServerIconStorageKind {
	const mime = primaryMimeType(contentType)
	const fromMime = MIME_TO_KIND[mime]
	if (fromMime) {
		return fromMime
	}
	const lower = filename.toLowerCase()
	for (const [suffix, kind] of FILENAME_SUFFIX_TO_KIND) {
		if (lower.endsWith(suffix)) {
			return kind
		}
	}
	if (mime.startsWith("image/")) {
		return "png"
	}
	return "png"
}

export function r2MetaForServerIconStorageKind(
	kind: ServerIconStorageKind
): { ext: string; contentType: string } {
	return R2_META_BY_KIND[kind]
}

/** Basename of Discord attachment, trimmed and capped for `ServerIconImageEntry.label`. */
export function labelFromAttachmentFilename(
	filename: string | null | undefined
): string | null {
	if (!filename) {
		return null
	}
	const base = filename.split(/[/\\]/).pop()?.trim() ?? ""
	if (!base) {
		return null
	}
	return base.slice(0, SERVER_ICON_MAX_LABEL_LENGTH)
}

/**
 * Resize for Discord server icon limits.
 * GIF: keep all frames (`animated: true`); other kinds use first page only (e.g. animated WebP → one frame).
 */
export async function normalizeServerIconForStorage(
	input: Buffer,
	kind: ServerIconStorageKind
): Promise<Buffer> {
	if (kind === "gif") {
		return serverIconSized(input, { animated: true }).gif().toBuffer()
	}

	const pipeline = serverIconSized(input, { pages: 1 })
	switch (kind) {
		case "jpeg":
			return pipeline.jpeg({ quality: 92, mozjpeg: true }).toBuffer()
		case "webp":
			return pipeline.webp({ quality: 90 }).toBuffer()
		case "png":
		default:
			return pipeline.png({ compressionLevel: 9 }).toBuffer()
	}
}
