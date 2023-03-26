// Import third-party packages
import { ActivityType, Client, GatewayIntentBits, REST, SlashCommandBuilder } from "discord.js"
import { Configuration, OpenAIApi } from "openai"
import { config as dotenv } from "dotenv"
import log4js from "log4js" // Does not support new import syntax

// Import helper functions
import { ensureEnvironmentVariable } from "./helpers"

// Output log messages to the console
log4js.configure( {
	appenders: {
		default: {
			type: "console"
		}
	},
	categories: {
		default: {
			appenders: [ "default" ],
			level: process.env.NODE_ENV === "production" ? "info" : "debug" // Hide debug messages in production
		}
	}
} )

// Create a logger for this file
const log = log4js.getLogger( "index" )

// Load environment variables from the .env file - only used during development
log.debug( "Loading environment variables..." )
const dotenvResult = dotenv()
if ( dotenvResult.error != undefined || dotenvResult.parsed == undefined ) {
	log.fatal( "Failed to load environment variables! (%s)", dotenvResult.error )
	process.exit( 1 )
}
log.info( "Loaded %d environment variables.", Object.keys( dotenvResult.parsed ).length )

// Check all the required environment variables are set
log.debug( "Checking environment variables..." )
const DISCORD_BOT_TOKEN = ensureEnvironmentVariable( "DISCORD_BOT_TOKEN" )
const OPENAI_API_KEY = ensureEnvironmentVariable( "OPENAI_API_KEY" )
log.debug( "All environment variables are present." )

// Create an OpenAI API client
log.debug( "Creating OpenAI API client..." )
export const openAI = new OpenAIApi( new Configuration( {
	apiKey: OPENAI_API_KEY,
} ) )
log.info( "Created OpenAI API client." )

// Setup the Discord client
log.debug( "Setting up Discord client..." )
export const discordClient = new Client( {

	// Only receive guild events & message content
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.MessageContent
	],

	// Prevent mentioning anyone
	allowedMentions: {
		repliedUser: false,
		parse: []
	},

	// Custom status
	presence: {
		status: "online",
		activities: [ {
			type: ActivityType.Playing,
			name: "with OpenAI's ChatGPT"
		} ]
	}

} )
log.info( "Setup Discord client." )

// Create a Discord API client
log.debug( "Creating Discord RESTful API client..." )
const discordAPIVersion = ( discordClient.options.ws?.version ?? 10 ).toString()
export const discordAPI = new REST( {
	version: discordAPIVersion
} )
log.info( "Created Discord RESTful API client (v%d).", discordAPIVersion )

// Create a global slash command
log.debug( "Creating slash commands..." )
export const slashCommands = [
	new SlashCommandBuilder()
		.setName( "conversation" )
		.setDescription( "Shows this help message." )
		.addSubcommand( subCommand => subCommand
			.setName( "start" )
			.setDescription( "Start a new conversation." )
			.addStringOption( option => option
				.setName( "prompt" )
				.setDescription( "The context to initalise the conversation with." )
				.setRequired( false )
				.setMaxLength( 400 )
			)
			.addNumberOption( option => option
				.setName( "temperature" )
				.setDescription( "Higher values make messages more random, while lower values make them more deterministic." )
				.setMinValue( 0.0 )
				.setMaxValue( 2.0 )
				.setRequired( false )
			)
			.addNumberOption( option => option
				.setName( "presence" )
				.setDescription( "Positive values penalize words if they have already been used, increasing the chance of new topics." )
				.setMinValue( -2.0 )
				.setMaxValue( 2.0 )
				.setRequired( false )
			)
			.addNumberOption( option => option
				.setName( "frequency" )
				.setDescription( "Positive values penalize words if they have been used alot, decreasing the chance to repeat lines." )
				.setMinValue( -2.0 )
				.setMaxValue( 2.0 )
				.setRequired( false )
			)
		)
		.addSubcommand( subCommand => subCommand
			.setName( "reset" )
			.setDescription( "Forget the conversation & start over." )
		)
		.toJSON()
]
log.debug( "Created slash commands." )

// Login to Discord
log.debug( "Logging in to Discord..." )
discordAPI.setToken( DISCORD_BOT_TOKEN )
discordClient.login( DISCORD_BOT_TOKEN )
log.info( "Logged in to Discord." )

// Stop the application on CTRL+C
const stopGracefully = () => {
	log.debug( "Logging out from Discord..." )
	discordClient.destroy()
	log.info( "Logged out from Discord." )

	process.exit( 0 )
}
process.once( "SIGINT", stopGracefully )
process.once( "SIGTERM", stopGracefully )
