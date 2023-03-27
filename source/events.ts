// Import third-party packages
import { CacheType, ChannelType, cleanCodeBlockContent, Client, Events, Interaction, Message, Routes } from "discord.js"
import { ChatCompletionRequestMessage } from "openai"
import log4js from "log4js" // Does not support new import syntax

// Import required variables
import { discordClient, discordAPI, openAI, slashCommands } from "./index.js"

// Create a logger for this file
const log = log4js.getLogger( "events" )

// Information about a chat conversation
interface Conversation {
	modelIdentifier: string,
	systemPrompt: string,
	sampleTemperature: number,
	presencePenalty: number,
	frequencyPenalty: number,
	messageHistory: ChatCompletionRequestMessage[]
}

// Holds chat conversations
const conversations: Map<string, Conversation> = new Map()

// When the Discord client is ready...
export const onReady = async ( client: Client<true> ) => {

	// Introduce ourself
	log.info( "Ready as '%s'!", client.user.tag )

	// Update global slash commands
	log.debug( "Registering slash commands..." )
	await discordAPI.put( Routes.applicationCommands( client.user.id ), {
		body: slashCommands
	} )
	log.info( "Registered slash commands." )

}

// When the Discord client receives a message...
export const onMessage = async ( message: Message<boolean> ) => {

	// Ignore messages from bots, not in thread, or beginning with the ignore prefix
	if ( message.author.bot || message.author.system ) return
	if ( !message.channel.isThread() ) return
	if ( message.cleanContent.startsWith( "!" ) == true ) return

	// Ignore messages from threads that are not conversations
	if ( !conversations.has( message.channel.id ) ) return
	const conversation = conversations.get( message.channel.id )!
	log.info( "Message '%s' (%s) from member '%s' (%s) in thread '%s' (%s).", message.cleanContent, message.id, message.author.tag, message.author.id, message.channel.name, message.channel.id )

	// Start typing in the thread while we generate a response
	await message.channel.sendTyping()
	log.debug( "Started typing in thread '%s' (%s).", message.channel.name, message.channel.id )

	// Add their message to the conversation history
	conversation.messageHistory.push( {
		role: "user",
		content: `${ message.author.username }: ${ message.cleanContent }`,
	} )
	log.debug( "Added message '%s' (%s) from member '%s' (%s) to conversation history for thread '%s' (%s).", message.cleanContent, message.id, message.author.tag, message.author.id, message.channel.name, message.channel.id )

	// Attempt to generate a response to their message
	try {
		log.debug( "Generating chat completion for message %d...", conversation.messageHistory.length )
		const chatCompletion = await openAI.createChatCompletion( {
			model: conversation.modelIdentifier,
			messages: conversation.messageHistory,
			temperature: conversation.sampleTemperature,
			presence_penalty: conversation.presencePenalty,
			frequency_penalty: conversation.frequencyPenalty,
			user: message.author.id,
			max_tokens: 1024,
			n: 1
		} )
		log.debug( "Received chat completion for message %d.", conversation.messageHistory.length )

		// Ensure we have a message
		let chatCompletionMessage = chatCompletion.data.choices[ 0 ].message?.content?.trim()
		if ( chatCompletionMessage == null ) throw new Error( "No message found in chat completion!" )
		log.info( "Generated chat completion message '%s'.", chatCompletionMessage )

		// Add the message to the conversation history
		conversation.messageHistory.push( {
			role: "assistant",
			content: chatCompletionMessage,
		} )
		log.debug( "Added chat completion message '%s' to conversation history for thread '%s' (%s).", chatCompletionMessage, message.channel.name, message.channel.id )

		// Reply to their message with the completion
		log.debug( "Replying to message '%s' (%s) from member '%s' (%s) in thread '%s' (%s)...", message.cleanContent, message.id, message.author.tag, message.author.id, message.channel.name, message.channel.id )
		await message.reply( chatCompletionMessage )

	// React with a sad face if we fail to generate a response
	} catch ( error ) {
		log.error( "Failed to generate chat completion! (%s)", error )
		await message.react( "😔" )
	}

}

// When the Discord client receives an interaction...
export const onInteraction = async ( interaction: Interaction<CacheType> ) => {

	// Ignore interactions that are not slash commands, not from a guild, or not in a text channel
	if ( !interaction.isChatInputCommand() ) return
	if ( !interaction.inGuild() ) return
	if ( !interaction.channel?.isTextBased() ) return

	// Ignore interactions that are not our conversation slash command
	if ( interaction.commandName != "conversation" ) return
	log.info( "Interaction '%s' (%s) from member '%s' (%s) in channel '%s' (%s).", interaction.commandName, interaction.id, interaction.user.tag, interaction.user.id, interaction.channel.name, interaction.channel.id )

	// If it is the start conversation command...
	if ( interaction.options.getSubcommand() == "start" ) {

		// Send indication that we are processing the interaction
		const defer = await interaction.deferReply( { ephemeral: true } )
		log.debug( "Deferring reply to interaction '%s'.", interaction.commandName )

		// Ensure we are not in a thread...
		if ( interaction.channel.type == ChannelType.GuildText ) {

			// Create a thread for the conversation
			log.debug( "Creating conversation thread for member '%s' (%s)", interaction.user.tag, interaction.user.id )
			const thread = await interaction.channel.threads.create( {
				name: `${ interaction.member.user.username }'s conversation`,
				type: ChannelType.PublicThread,
				autoArchiveDuration: 60
			} )
			log.debug( "Created conversation thread '%s' (%s) for member '%s' (%s).", thread.name, thread.id, interaction.user.tag, interaction.user.id )

			// Prompt for the chat completion, decent default if none provided
			const systemPrompt = interaction.options.getString( "prompt" ) ?? [
				`You are a bot on Discord, your name is Suimin.`,
				"You are talking to multiple humans, their names will prefix their messages in the format 'Name: Message' to help you distinguish them. You should NOT prefix your messages with your name.",
				"You are not an assistant. Your goal is to maintain a casual conversation with the humans.",
				`Today's date is ${ new Date().toLocaleDateString( "en-GB" ) }.`
			].join( " " )

			// Store this conversation's information
			conversations.set( thread.id, {

				// Model & context
				modelIdentifier: interaction.options.getString( "model" ) ?? "gpt-3.5-turbo", // Default to GPT-3.5
				systemPrompt: systemPrompt,

				// Tune the responses
				sampleTemperature: interaction.options.getNumber( "temperature" ) ?? 1.0,
				presencePenalty: interaction.options.getNumber( "presence" ) ?? 0.0,
				frequencyPenalty: interaction.options.getNumber( "frequency" ) ?? 0.0,

				// Holds the conversation's history, starts with the prompt
				messageHistory: [
					{ role: "system", content: systemPrompt }
				]

			} )
			log.debug( "Initialised conversation information for thread '%s' (%s).", thread.name, thread.id )

			// Show the conversation information
			const conversation = conversations.get( thread.id )!
			log.debug( "System Prompt: '%s'.", conversation.systemPrompt )
			log.debug( "Model Identifier: '%s'.", conversation.modelIdentifier )
			log.debug( "Sample Temperature: '%d'.", conversation.sampleTemperature )
			log.debug( "Presence Penalty: '%d'.", conversation.presencePenalty )
			log.debug( "Frequency Penalty: '%d'.", conversation.frequencyPenalty )

			// Send an opening message in the thread containing the conversation's information
			await thread.send( [
				`System Prompt: \`\`\`${ cleanCodeBlockContent( conversation.systemPrompt ) }\`\`\``,
				`Model Identifier: \`${ conversation.modelIdentifier }\``,
				`Sample Temperature: \`${ conversation.sampleTemperature }\``,
				`Presence Penalty: \`${ conversation.presencePenalty }\``,
				`Frequency Pelanty: \`${ conversation.frequencyPenalty }\``
			].join( "\n" ) )
			log.debug( "Sent opening message in conversation thread '%s' (%s).", thread.name, thread.id )

			// Add the member to the thread
			await thread.members.add( interaction.member.user.id )
			log.debug( "Added member '%s' (%s) to conversation thread '%s' (%s).", interaction.user.tag, interaction.user.id, thread.name, thread.id )

			// Send a message to the channel indicating the conversation has started
			await defer.edit( { content: `Created <#${ thread.id }> for the conversation.` } )
			log.info( "Member '%s' (%s) started conversation thread '%s' (%s).", interaction.user.tag, interaction.user.id, thread.name, thread.id )

		// Cannot start a conversation when in a thread
		} else {
			await defer.edit( { content: "This command is only usable in a text channel." } )
			log.warn( "Member '%s' (%s) attempted to start conversation while not in a text channel (%s)!", interaction.user.tag, interaction.user.id, interaction.channel.id )
		}

	// If it is the reset conversation command...
	} else if ( interaction.options.getSubcommand() == "reset" ) {
		
		// Ensure we are in a thread...
		if ( interaction.channel.isThread() ) {

			// Ensure this is a conversation thread...
			if ( conversations.has( interaction.channel.id ) ) {
				const conversation = conversations.get( interaction.channel.id )!

				// Reset the message history back to just the prompt
				const prompt = conversation.messageHistory[ 0 ]
				conversation.messageHistory = [ prompt ]
				log.debug( "Cleared message history for thread '%s' (%s).", interaction.channel.name, interaction.channel.id )

				// Send a message to the channel indicating the conversation has been reset
				await interaction.reply( "Conversation reset." )
				log.info( "Member '%s' (%s) reset conversation in thread '%s' (%s)", interaction.user.tag, interaction.user.id, interaction.channel.name, interaction.channel.id )

			// Cannot reset a non-conversation thread
			} else {
				await interaction.reply( { content: "This thread is not a conversation.", ephemeral: true } )
				log.warn( "Member '%s' (%s) attempted to reset non-existant conversation in thread '%s' (%s)!", interaction.user.tag, interaction.user.id, interaction.channel.name, interaction.channel.id )
			}

		// Cannot reset a conversation when not in a thread
		} else {
			await interaction.reply( { content: "This command is only usable from within a conversation thread.", ephemeral: true } )
			log.warn( "Member '%s' (%s) attempted to reset conversation while not in a thread (%s)!", interaction.user.tag, interaction.user.id, interaction.channel.id )
		}

	// Fallback to unknown command message if its not one of the above commands
	} else {
		await interaction.reply( { content: "Unrecognised command.", ephemeral: true } )
		log.warn( "Member '%s' (%s) ran unrecognised sub-command '%s' (%s)!", interaction.user.tag, interaction.user.id, interaction.options.getSubcommand(), interaction.id )
	}

}
