import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

import { config } from "../config.ts"

let client: S3Client | null = null

export function getR2Client(): S3Client {
	if (!client) {
		client = new S3Client({
			region: "auto",
			endpoint: config.r2.endpoint,
			credentials: {
				accessKeyId: config.r2.accessKeyId,
				secretAccessKey: config.r2.secretAccessKey,
			},
			forcePathStyle: true,
		})
	}
	return client
}

export async function r2PutImage(
	key: string,
	body: Buffer,
	contentType: string
): Promise<void> {
	await getR2Client().send(
		new PutObjectCommand({
			Bucket: config.r2.bucketName,
			Key: key,
			Body: body,
			ContentType: contentType,
		})
	)
}

export async function r2GetBuffer(key: string): Promise<Buffer> {
	const out = await getR2Client().send(
		new GetObjectCommand({
			Bucket: config.r2.bucketName,
			Key: key,
		})
	)
	const body = out.Body
	if (!body) {
		throw new Error("R2 GetObject: empty body")
	}
	return Buffer.from(await body.transformToByteArray())
}

export async function r2DeleteObject(key: string): Promise<void> {
	await getR2Client().send(
		new DeleteObjectCommand({
			Bucket: config.r2.bucketName,
			Key: key,
		})
	)
}
