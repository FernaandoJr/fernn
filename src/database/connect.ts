import mongoose from "mongoose"

import { config } from "../config.ts"

export async function connectDatabase(): Promise<void> {
	await mongoose.connect(config.mongoUri)
}
