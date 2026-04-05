import mongoose, { type Document, Schema } from "mongoose"

import {
	SERVER_ICON_DEFAULT_INTERVAL_MINUTES,
	SERVER_ICON_MAX_IMAGES,
} from "../../constants/serverIcon.ts"

export type ServerIconImageEntry = {
	id: string
	r2Key: string
	addedByUserId: string
	label: string | null
	createdAt: Date
}

export type ServerIconRotationDoc = {
	guildId: string
	enabled: boolean
	intervalMinutes: number
	cursor: number
	lastRotationAt: Date | null
	images: ServerIconImageEntry[]
}

type ServerIconRotationDocument = ServerIconRotationDoc &
	Document & {
		createdAt?: Date
		updatedAt?: Date
	}

const ImageEntrySchema = new Schema(
	{
		id: { type: String, required: true },
		r2Key: { type: String, required: true },
		addedByUserId: { type: String, required: true },
		label: { type: String, default: null },
		createdAt: { type: Date, default: () => new Date() },
	},
	{ _id: false }
)

const ServerIconRotationSchema = new Schema(
	{
		guildId: { type: String, required: true, unique: true, index: true },
		enabled: { type: Boolean, default: false },
		intervalMinutes: {
			type: Number,
			default: SERVER_ICON_DEFAULT_INTERVAL_MINUTES,
		},
		cursor: { type: Number, default: 0 },
		lastRotationAt: { type: Date, default: null },
		images: { type: [ImageEntrySchema], default: [] },
	},
	{ timestamps: true, collection: "servericonrotations" }
)

export const ServerIconRotationModel =
	(mongoose.models.ServerIconRotation as
		| mongoose.Model<ServerIconRotationDocument>
		| undefined) ??
	mongoose.model<ServerIconRotationDocument>(
		"ServerIconRotation",
		ServerIconRotationSchema
	)

function toPlain(doc: ServerIconRotationDocument): ServerIconRotationDoc {
	return {
		guildId: doc.guildId,
		enabled: doc.enabled,
		intervalMinutes: doc.intervalMinutes,
		cursor: doc.cursor,
		lastRotationAt: doc.lastRotationAt,
		images: doc.images.map((img) => ({
			id: img.id,
			r2Key: img.r2Key,
			addedByUserId: img.addedByUserId,
			label: img.label ?? null,
			createdAt: img.createdAt,
		})),
	}
}

export async function getServerIconRotation(
	guildId: string
): Promise<ServerIconRotationDoc | null> {
	const doc = await ServerIconRotationModel.findOne({ guildId }).lean().exec()
	if (!doc) {
		return null
	}
	return {
		guildId: doc.guildId,
		enabled: doc.enabled,
		intervalMinutes: doc.intervalMinutes,
		cursor: doc.cursor,
		lastRotationAt: doc.lastRotationAt,
		images: doc.images.map((img) => ({
			id: img.id,
			r2Key: img.r2Key,
			addedByUserId: img.addedByUserId,
			label: img.label ?? null,
			createdAt: img.createdAt,
		})),
	}
}

export async function upsertServerIconRotation(
	guildId: string,
	patch: Partial<
		Pick<
			ServerIconRotationDoc,
			"enabled" | "intervalMinutes" | "cursor" | "lastRotationAt"
		>
	>
): Promise<ServerIconRotationDoc> {
	const updated = await ServerIconRotationModel.findOneAndUpdate(
		{ guildId },
		{ $set: patch },
		{ new: true, upsert: true, setDefaultsOnInsert: true }
	)
		.lean()
		.exec()

	if (!updated) {
		throw new Error("ServerIconRotation upsert failed")
	}
	return {
		guildId: updated.guildId,
		enabled: updated.enabled,
		intervalMinutes: updated.intervalMinutes,
		cursor: updated.cursor,
		lastRotationAt: updated.lastRotationAt,
		images: updated.images.map((img) => ({
			id: img.id,
			r2Key: img.r2Key,
			addedByUserId: img.addedByUserId,
			label: img.label ?? null,
			createdAt: img.createdAt,
		})),
	}
}

export async function pushServerIconImage(
	guildId: string,
	entry: Omit<ServerIconImageEntry, "createdAt"> & { createdAt?: Date }
): Promise<ServerIconRotationDoc> {
	const doc = await ServerIconRotationModel.findOne({ guildId }).exec()
	const count = doc?.images.length ?? 0
	if (count >= SERVER_ICON_MAX_IMAGES) {
		throw new Error("SERVER_ICON_MAX_IMAGES")
	}

	const createdAt = entry.createdAt ?? new Date()
	const sub = {
		id: entry.id,
		r2Key: entry.r2Key,
		addedByUserId: entry.addedByUserId,
		label: entry.label,
		createdAt,
	}

	const updated = await ServerIconRotationModel.findOneAndUpdate(
		{ guildId },
		{ $push: { images: sub } },
		{
			new: true,
			upsert: true,
			setDefaultsOnInsert: true,
			runValidators: true,
		}
	).exec()

	if (!updated) {
		throw new Error("pushServerIconImage failed")
	}
	return toPlain(updated)
}

export async function pullServerIconImageById(
	guildId: string,
	imageId: string
): Promise<ServerIconRotationDoc | null> {
	const updated = await ServerIconRotationModel.findOneAndUpdate(
		{ guildId, "images.id": imageId },
		{ $pull: { images: { id: imageId } } },
		{ new: true }
	).exec()

	if (!updated) {
		return null
	}
	return toPlain(updated)
}

export async function updateServerIconRotationCursor(
	guildId: string,
	cursor: number,
	lastRotationAt: Date
): Promise<void> {
	await ServerIconRotationModel.updateOne(
		{ guildId },
		{ $set: { cursor, lastRotationAt } }
	).exec()
}

export async function findEnabledServerIconRotations(): Promise<
	ServerIconRotationDoc[]
> {
	const docs = await ServerIconRotationModel.find({
		enabled: true,
		"images.0": { $exists: true },
	})
		.lean()
		.exec()

	return docs.map((doc) => ({
		guildId: doc.guildId,
		enabled: doc.enabled,
		intervalMinutes: doc.intervalMinutes,
		cursor: doc.cursor,
		lastRotationAt: doc.lastRotationAt,
		images: doc.images.map((img) => ({
			id: img.id,
			r2Key: img.r2Key,
			addedByUserId: img.addedByUserId,
			label: img.label ?? null,
			createdAt: img.createdAt,
		})),
	}))
}
