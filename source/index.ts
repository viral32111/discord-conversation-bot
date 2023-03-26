import { ActivityType, ChannelType, cleanCodeBlockContent, Client, Events, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js"
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai"
import { config as dotenv } from "dotenv"
import log4js from "log4js"

log4js.configure( {
	appenders: { default: { type: "console" } },
	categories: { default: { appenders: [ "default" ], level: "debug" } }
} )

const logger = log4js.getLogger()

logger.debug( "Loading environment variables..." )
dotenv()

if ( process.env.DISCORD_BOT_TOKEN == null ) throw new Error( "Environment variable DISCORD_BOT_TOKEN is not set" )
if ( process.env.DISCORD_GUILD_ID == null ) throw new Error( "Environment variable DISCORD_GUILD_ID is not set" )
if ( process.env.OPENAI_API_KEY == null ) throw new Error( "Environment variable OPENAI_API_KEY is not set" )

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

const openAI = new OpenAIApi( new Configuration( {
	apiKey: OPENAI_API_KEY,
} ) )

logger.debug( "Creating Discord client..." )
const client = new Client( {
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.MessageContent
	],
	allowedMentions: {
		repliedUser: false,
		parse: [],
	},
	presence: {
		status: "online",
		activities: [ {
			type: ActivityType.Playing,
			name: "with OpenAI's ChatGPT",
		} ]
	}
} )
logger.debug( "Created Discord client." )

logger.debug( "Creating REST client..." )
const rest = new REST( {
	version: "10"
} ).setToken( DISCORD_BOT_TOKEN )
logger.debug( "Created REST client." )

logger.debug( "Creating slash commands..." )
const slashCommands = [
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
		.toJSON(),
]
logger.debug( "Created slash commands." )

client.once( Events.ClientReady, async ( client ) => {
	logger.info( "Ready as '%s'!", client.user.tag )

	logger.debug( "Deleting slash commands..." )
	await rest.put( Routes.applicationGuildCommands( client.user.id, DISCORD_GUILD_ID ), { body: [] } )
	await rest.put( Routes.applicationCommands( client.user.id ), { body: [] } )
	logger.debug( "Deleted slash commands." )

	logger.debug( "Registering slash commands..." )
	await rest.put( Routes.applicationGuildCommands( client.user.id, DISCORD_GUILD_ID ), {
		body: slashCommands
	} )
	logger.info( "Registered slash commands." )

} )

interface Conversation {
	systemPrompt: string,
	sampleTemperature: number,
	presencePenalty: number,
	frequencyPenalty: number,
	messageHistory: ChatCompletionRequestMessage[]
}

const conversations: Map<string, Conversation> = new Map()

client.on( Events.MessageCreate, async ( message ) => {
	if ( message.author.bot || message.author.system ) return
	if ( !message.channel.isThread() ) return

	if ( message.cleanContent.startsWith( "!" ) == true ) return

	if ( !conversations.has( message.channel.id ) ) return
	const conversation = conversations.get( message.channel.id )!

	logger.info( "Message '%s' in thread '%s' from user '%s'.", message.cleanContent, message.channel.id, message.author.tag )

	await message.channel.sendTyping();
	logger.debug( "Started typing in thread '%s'.", message.channel.id )

	conversation.messageHistory.push( {
		role: "user",
		content: `${ message.author.username }: ${ message.cleanContent }`,
	} )
	logger.debug( "Added message to channel history for thread '%s'.", message.channel.id )

	try {
		logger.debug( "Generating chat completion..." )
		const chatCompletion = await openAI.createChatCompletion( {
			model: "gpt-3.5-turbo",
			messages: conversation.messageHistory,
			temperature: conversation.sampleTemperature,
			presence_penalty: conversation.presencePenalty,
			frequency_penalty: conversation.frequencyPenalty,
			user: message.author.id,
			max_tokens: 1024,
			n: 1
		} )
		logger.debug( "Generated chat completion." )

		let completionMessage = chatCompletion.data.choices[ 0 ].message?.content?.trim()
		if ( completionMessage == null ) throw new Error( "No completion message found!" )

		conversation.messageHistory.push( {
			role: "assistant",
			content: completionMessage,
		} )
		logger.debug( "Added chat completion to message history." )

		await message.reply( completionMessage )
		logger.info( "Generated chat completion '%s'.", completionMessage )

	} catch ( error ) {
		logger.error( "Failed to generate chat completion: '%s'", error )
		await message.react( "😔" )
	}

} )

client.on( Events.InteractionCreate, async ( interaction ) => {
	if ( !interaction.isChatInputCommand() ) return

	if ( !interaction.inGuild() ) return
	if ( !interaction.channel?.isTextBased() ) return

	if ( interaction.commandName != "conversation" ) return

	logger.info( "Interaction '%s' (%s) from member '%s'.", interaction.commandName, interaction.id, interaction.user.tag )

	if ( interaction.options.getSubcommand() == "start" ) {
		const defer = await interaction.deferReply( { ephemeral: true } )
		logger.debug( "Deferring reply to interaction '%s'.", interaction.commandName )

		if ( interaction.channel.type == ChannelType.GuildText ) {
			const thread = await interaction.channel.threads.create( {
				name: `${ interaction.member.user.username }'s conversation`,
				type: ChannelType.PublicThread,
				autoArchiveDuration: 60,
			} )
			logger.debug( "Created thread '%s' (%s).", thread.name, thread.id )

			conversations.set( thread.id, {
				systemPrompt: interaction.options.getString( "prompt" ) ?? [
					`You are a bot on Discord, your name is Suimin.`,
					"You are talking to multiple humans, their names will prefix their messages in the format 'Name: Message' to help you distinguish them. You should NOT prefix your messages with your name.",
					"You are not an assistant. Your goal is to maintain a casual conversation with the humans.",
					`Today's date is ${ new Date().toLocaleDateString( "en-GB" ) }.`
				].join( " " ),
				sampleTemperature: interaction.options.getNumber( "temperature" ) ?? 1.0,
				presencePenalty: interaction.options.getNumber( "presence" ) ?? 0.0,
				frequencyPenalty: interaction.options.getNumber( "frequency" ) ?? 0.0,
				messageHistory: []
			} )
			const conversation = conversations.get( thread.id )!
			conversation.messageHistory.push( { role: "system", content: conversation.systemPrompt } )
			logger.debug( "Initialised conversation for thread '%s'.", thread.name )

			logger.debug( "Prompt: '%s'.", conversation.systemPrompt )
			logger.debug( "Sample Temperature: '%d'.", conversation.sampleTemperature )
			logger.debug( "Presence Penalty: '%d'.", conversation.presencePenalty )
			logger.debug( "Frequency Penalty: '%d'.", conversation.frequencyPenalty )

			await thread.send( `System Prompt: \`\`\`${ cleanCodeBlockContent( conversation.systemPrompt ) }\`\`\`\nSample Temperature: \`${ conversation.sampleTemperature }\`\nPresence Penalty: \`${ conversation.presencePenalty }\`\nFrequency Pelanty: \`${ conversation.frequencyPenalty }\`` )
			logger.debug( "Sent opening message in thread '%s'.", thread.name )

			await thread.members.add( interaction.member.user.id )
			logger.debug( "Added member '%s' to thread '%s'.", interaction.user.tag, thread.name )

			await defer.edit( { content: `Created <#${ thread.id }> for the conversation.` } )
			logger.info( "Member '%s' started conversation in thread '%s'.", interaction.user.tag, thread.name )

		} else {
			await defer.edit( { content: "This command is only usable in a text channel." } )
			logger.warn( "Member '%s' attempted to start conversation while not in a text channel!", interaction.user.tag )
		}

	} else if ( interaction.options.getSubcommand() == "reset" ) {
		if ( interaction.channel.isThread() ) {
			if ( conversations.has( interaction.channel.id ) ) {
				const conversation = conversations.get( interaction.channel.id )!
				const prompt = conversation.messageHistory[ 0 ]
				conversation.messageHistory = [ prompt ]
				logger.debug( "Cleared message history for thread '%s'.", interaction.channel.name )

				await interaction.reply( "Conversation reset." )
				logger.info( "Member '%s' reset conversation in thread '%s'", interaction.user.tag, interaction.channel.name )

			} else {
				await interaction.reply( { content: "This thread is not a conversation.", ephemeral: true } )
				logger.warn( "Member '%s' attempted to reset non-existant conversation in thread '%s'!", interaction.user.tag, interaction.channel.name )
			}

		} else {
			await interaction.reply( { content: "This command is only usable from within a conversation thread.", ephemeral: true } )
			logger.warn( "Member '%s' attempted to reset conversation while not in a thread!", interaction.user.tag )
		}

	} else {
		await interaction.reply( { content: "Unrecognised command.", ephemeral: true } )
		logger.warn( "Member '%s' ran unrecognised sub-command '%s'!", interaction.user.tag, interaction.options.getSubcommand() )
	}

} )

logger.info( "Logging in..." )
client.login( DISCORD_BOT_TOKEN )
logger.debug( "Logged in." )

const shutdown = () => {
	logger.info( "Logging out..." )
	client.destroy()
	logger.debug( "Logged out." )
}

process.once( "SIGINT", shutdown )
process.once( "SIGTERM", shutdown )
