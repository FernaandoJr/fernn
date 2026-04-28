const getRequiredEnv = (name: string): string => {
	const value = process.env[name]

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`)
	}

	return value
}

const token = getRequiredEnv("DISCORD_TOKEN")
const clientId = getRequiredEnv("DISCORD_CLIENT_ID")
const mongoUri = getRequiredEnv("MONGODB_URI")
const environment = getRequiredEnv("ENVIRONMENT").trim().toUpperCase()

if (environment !== "P" && environment !== "G") {
	throw new Error(
		`Invalid ENVIRONMENT "${process.env.ENVIRONMENT}"; use P (global/production) or G (guild-scoped).`,
	)
}

const deployGlobally = environment === "P"
const guildId = deployGlobally
	? process.env.DISCORD_GUILD_ID
	: getRequiredEnv("DISCORD_GUILD_ID")

const r2AccountId = getRequiredEnv("R2_ACCOUNT_ID")
const r2AccessKeyId = getRequiredEnv("R2_ACCESS_KEY_ID")
const r2SecretAccessKey = getRequiredEnv("R2_SECRET_ACCESS_KEY")
const r2BucketName = getRequiredEnv("R2_BUCKET_NAME")
const r2Endpoint =
	process.env.R2_ENDPOINT ??
	`https://${r2AccountId}.r2.cloudflarestorage.com`

export const config = {
	token,
	clientId,
	mongoUri,
	guildId,
	deployGlobally,
	r2: {
		accountId: r2AccountId,
		accessKeyId: r2AccessKeyId,
		secretAccessKey: r2SecretAccessKey,
		bucketName: r2BucketName,
		endpoint: r2Endpoint,
	},
} as const
