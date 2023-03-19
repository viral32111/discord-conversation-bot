# Discord Conversation Bot

[![CI](https://github.com/viral32111/discord-conversation-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/viral32111/discord-conversation-bot/actions/workflows/ci.yml)
[![CodeQL](https://github.com/viral32111/discord-conversation-bot/actions/workflows/codeql.yml/badge.svg)](https://github.com/viral32111/discord-conversation-bot/actions/workflows/codeql.yml)

This is a bot for Discord that uses [OpenAI's Chat Completion API](https://platform.openai.com/docs/guides/chat) (a.k.a. ChatGPT, GPT 3.5 Turbo) to have conversations with members in a server.

## Background

I simply made this because it seems like every other developer is experimenting with AI right now, and since [OpenAI recently announced their chat completion API](https://openai.com/blog/introducing-chatgpt-and-whisper-apis), I thought now is probably a better time than never. There's no other motiviation behind this than just wanting an excuse to play around with ChatGPT from a development view.

## Usage

**NOTE: [OpenAI's Chat Completion API](https://platform.openai.com/docs/guides/chat) is not free, though still quite cheap, and thus requires setting up a recurring billing account.**

### Release

1. Download & extract the [latest stable release](https://github.com/viral32111/discord-conversation-bot/releases/latest).
2. Open a terminal in the newly created directory.
3. Install production dependencies via `npm install --omit=dev`.
4. Create an environment variables file (`.env`) and add [the required properties](#Configuration).
5. Launch via `node .`.
6. Use the `/conversation` slash command in your Discord server.

### Docker

**This method is only for Linux as I have not created Windows-based Docker images yet!**

1. Download the [latest stable Docker image](#) via `docker image pull ghcr.io/discord-conversation-bot:latest`.
2. Create a container via `docker container run --name discord-conversation-bot --interactive --tty --restart on-failure ghcr.io/discord-conversation-bot:latest`.
	* Ensure to add [`--env`](https://docs.docker.com/engine/reference/commandline/run/#env) flags for each of [the required properties](#Configuration), or [create an environment file](https://docs.docker.com/compose/environment-variables/env-file/) and use the `--env-file` flag.
3. Start the container via `docker container start discord-conversation-bot`.
4. Use the `/conversation` slash command in your Discord server.

## Configuration

Environment variables are used to configure functionality. The following are required:

* `DISCORD_BOT_TOKEN` should be set to the bot token of your Discord application. Visit the [Discord Developer Portal](https://discord.com/developers/applications) to obtain this.
* `DISCORD_GUILD_ID` should be set to the ID of your server.
* `OPENAI_API_KEY` should be set to your [OpenAI account API key](https://platform.openai.com/account/api-keys).

## Building

1. Clone this repository via `git clone https://github.com/viral32111/discord-conversation-bot`.
2. Open a terminal in the repository's directory.
3. Install production & development dependencies via `npm install`.
4. Create an environment variables file (`.env`) and add [the required properties](#Configuration).
5. Launch via `npm start`.
6. Use the `/conversation` slash command in your Discord server.

## License

Copyright (C) 2023 [viral32111](https://viral32111.com).

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see https://www.gnu.org/licenses.
