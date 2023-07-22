# Discord Conversation Bot

[![CI](https://github.com/viral32111/discord-conversation-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/viral32111/discord-conversation-bot/actions/workflows/ci.yml)
[![CodeQL](https://github.com/viral32111/discord-conversation-bot/actions/workflows/codeql.yml/badge.svg)](https://github.com/viral32111/discord-conversation-bot/actions/workflows/codeql.yml)
![GitHub latest release](https://img.shields.io/github/v/release/viral32111/discord-conversation-bot?label=Latest%20Release)
![GitHub repository size](https://img.shields.io/github/repo-size/viral32111/discord-conversation-bot?label=Size)
![GitHub release downloads](https://img.shields.io/github/downloads/viral32111/discord-conversation-bot/total?label=Downloads)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/viral32111/discord-conversation-bot?label=Commits)

This is a bot for Discord that uses [OpenAI's Chat Completion API](https://platform.openai.com/docs/guides/chat) (a.k.a. ChatGPT) to have conversations with members in a server.

Model support currently includes [GPT-3.5](https://platform.openai.com/docs/models/gpt-3-5) (`gpt-3.5-turbo`) and [GPT-4](https://platform.openai.com/docs/models/gpt-4) (`gpt-4`).

## 📜 Background

I simply made this because it seems like every other developer is experimenting with AI right now, and since [OpenAI recently announced their chat completion API](https://openai.com/blog/introducing-chatgpt-and-whisper-apis), I thought now is probably a better time than never. There's no other motiviation behind this than just wanting an excuse to play around with ChatGPT from a development view.

## 📥 Usage

**NOTE: [OpenAI's Chat Completion API](https://platform.openai.com/docs/guides/chat) is not free, though still quite cheap, and thus requires setting up a recurring billing account.**

**NOTE: The [GPT-4](https://platform.openai.com/docs/models/gpt-4) model is currently in a limited beta, if you have not been granted access then your Discord server members will only be able to use the [GPT-3.5](https://platform.openai.com/docs/models/gpt-3-5) model.**

### 📦 Release

1. Download & extract the [latest stable release](https://github.com/viral32111/discord-conversation-bot/releases/latest).
2. Open a terminal in the newly created directory.
3. Install production dependencies via `npm install --omit=dev`.
4. Create an environment variables file (`.env`) and add [the required properties](#Configuration).
5. Launch via `node .`.
6. Use the `/conversation` slash command in your Discord server.

### 🐳 Docker

1. Download the [latest stable Docker image](https://github.com/viral32111/discord-conversation-bot/pkgs/container/discord-conversation-bot) for your platform.
2. Create a container via `docker container create --name discord-conversation-bot --interactive --tty --restart on-failure ghcr.io/discord-conversation-bot`.
	* Ensure to add [`--env`](https://docs.docker.com/engine/reference/commandline/run/#env) flags for each of [the required properties](#Configuration), or [create an environment file](https://docs.docker.com/compose/environment-variables/env-file/) and use the `--env-file` flag.
	* Ensure to append the appropriate tag for your platform to the image name (e.g., `:latest-ubuntu-amd64`, `:latest-windows-amd64`, etc.)
3. Start the container via `docker container start discord-conversation-bot`.
4. Use the `/conversation` slash command in your Discord server.

## ⚙️ Configuration

Environment variables are used to configure functionality. The following are required:

* `DISCORD_BOT_TOKEN` should be set to the [bot token of your Discord application](https://discord.com/developers/applications).
* ~~`DISCORD_GUILD_ID` should be set to the ID of your server.~~ *Removed in version 1.1.0.*
* `OPENAI_API_KEY` should be set to your [OpenAI account API key](https://platform.openai.com/account/api-keys).

## 🏗️ Building

1. Clone this repository via `git clone https://github.com/viral32111/discord-conversation-bot`.
2. Open a terminal in the repository's directory.
3. Install production & development dependencies via `npm install`.
4. Create an environment variables file (`.env`) and add [the required properties](#Configuration).
5. Launch via `npm start`.
6. Use the `/conversation` slash command in your Discord server.

## 🔗 Useful Links

* [Discord.js Documentation](https://discord.js.org/#/docs/discord.js/main/general/welcome)
* [Discord.js Guide](https://discordjs.guide/creating-your-bot/main-file.html)
* [OpenAI Chat Completion Guide](https://platform.openai.com/docs/guides/chat)
* [OpenAI Chat API Reference](https://platform.openai.com/docs/api-reference/chat/create)
* [NPM log4js package](https://www.npmjs.com/package/log4js)
* [NPM dotenv package](https://www.npmjs.com/package/dotenv)
* [NPM openai package](https://www.npmjs.com/package/openai)

## ⚖️ License

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
