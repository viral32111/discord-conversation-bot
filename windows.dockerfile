# syntax=docker/dockerfile:1
# docker image build --pull --rm --file ./windows.dockerfile --tag discord-conversation-bot:local --build-arg DOCKER_BUILDKIT=1 ./

# Start from Microsoft's PowerShell image for LTSC 2022
FROM mcr.microsoft.com/powershell:lts-nanoserver-ltsc2022 AS powershell

# Configure PowerShell
ARG POWERSHELL_VERSION=7.3.3 \
	POWERSHELL_DIRECTORY=C:\\Users\\ContainerUser\\PowerShell

# Use built-in PowerShell without telemetry
SHELL [ "pwsh", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';" ]
ENV POWERSHELL_TELEMETRY_OPTOUT=1

# Download & extract PowerShell
RUN Set-Variable -Name TEMPORARY_DIRECTORY -Value "${ENV:UserProfile}\\AppData\\Local\\Temp"; \
	Invoke-WebRequest -Uri "https://github.com/PowerShell/PowerShell/releases/download/v${ENV:POWERSHELL_VERSION}/PowerShell-${ENV:POWERSHELL_VERSION}-win-x64.zip" -OutFile "${TEMPORARY_DIRECTORY}\\PowerShell.zip"; \
	Expand-Archive -Path "${TEMPORARY_DIRECTORY}\\PowerShell.zip" -DestinationPath "${ENV:POWERSHELL_DIRECTORY}"; \
	Remove-Item -Path "${TEMPORARY_DIRECTORY}\\PowerShell.zip"

#####################################################################

# Start from Microsoft's Windows Nano Server image for LTSC 2022
FROM mcr.microsoft.com/windows/nanoserver:ltsc2022

# Configure the image
ARG NODEJS_VERSION=19.8.1 \
	NODEJS_DIRECTORY=C:\\Users\\ContainerUser\\NodeJS \
	POWERSHELL_DIRECTORY=C:\\Users\\ContainerUser\\PowerShell \
	APP_DIRECTORY=C:\\Users\\ContainerUser\\Discord-Conversation-Bot

# Use PowerShell from the previous step without telemetry
COPY --from=powershell --chown=Administrator "${POWERSHELL_DIRECTORY}" "${POWERSHELL_DIRECTORY}"
SHELL [ "C:\\Users\\ContainerUser\\PowerShell\\pwsh", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';" ]
ENV POWERSHELL_TELEMETRY_OPTOUT=1

# Download & extract Node.js
RUN Set-Variable -Name TEMPORARY_DIRECTORY -Value "${ENV:UserProfile}\\AppData\\Local\\Temp"; \
	Invoke-WebRequest -Uri "https://nodejs.org/dist/v${ENV:NODEJS_VERSION}/node-v${ENV:NODEJS_VERSION}-win-x64.zip" -OutFile "${TEMPORARY_DIRECTORY}\\NodeJS.zip"; \
	Expand-Archive -Path "${TEMPORARY_DIRECTORY}\\NodeJS.zip" -DestinationPath "${TEMPORARY_DIRECTORY}\\NodeJS"; \
	Move-Item -Path "${TEMPORARY_DIRECTORY}\\NodeJS\\node-v${ENV:NODEJS_VERSION}-win-x64" -Destination "${ENV:NODEJS_DIRECTORY}"; \
	Remove-Item -Recurse -Path "${TEMPORARY_DIRECTORY}\\NodeJS", "${TEMPORARY_DIRECTORY}\\NodeJS.zip"

# Add Node.js & PowerShell to the system path, and set the Node.js environment
ENV PATH="${NODEJS_DIRECTORY};${POWERSHELL_DIRECTORY};C:\\Windows\\System32;C:\\Windows" \
	NODE_ENV=production

# Update NPM to the latest version
RUN npm install --global npm@latest; \
	npm cache clean --force; \
	Remove-Item -Recurse -Path "${ENV:LocalAppData}\\npm-cache"

# Create & switch to the directory for the project
RUN New-Item -ItemType "directory" -Path "${ENV:APP_DIRECTORY}"
WORKDIR ${APP_DIRECTORY}

# Add package files & JavaScript code
COPY ./package.json ${APP_DIRECTORY}/package.json
COPY ./package-lock.json ${APP_DIRECTORY}/package-lock.json
COPY ./dist/ ${APP_DIRECTORY}/dist/

# Install production dependencies
RUN npm install --omit=dev

# Launch the project
ENTRYPOINT [ "node", "." ]
