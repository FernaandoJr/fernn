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
const guildId = process.env.DISCORD_GUILD_ID

export const config = {
	token,
	clientId,
	mongoUri,
	guildId,
	deployGlobally: !guildId,
} as const
