# syntax=docker/dockerfile:1
# docker image build --file ./windows.dockerfile --tag discord-conversation-bot:local --build-arg DOCKER_BUILDKIT=1 ./

# Start from Microsoft's PowerShell image for LTSC 2019
FROM mcr.microsoft.com/powershell:lts-nanoserver-1809 AS powershell
SHELL [ "pwsh.exe", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';" ]

# Disable telemetry
ENV POWERSHELL_TELEMETRY_OPTOUT=1

# Configure PowerShell
ARG POWERSHELL_VERSION=7.3.3 \
	POWERSHELL_DIRECTORY=C:\\PowerShell

# Download & extract PowerShell
RUN Invoke-WebRequest -Uri "https://github.com/PowerShell/PowerShell/releases/download/v${ENV:POWERSHELL_VERSION}/PowerShell-${ENV:POWERSHELL_VERSION}-win-x64.zip" -OutFile "C:\\PowerShell.zip"; \
	Expand-Archive -Path "C:\\PowerShell.zip" -DestinationPath "${ENV:POWERSHELL_DIRECTORY}"; \
	Remove-Item -Path "C:\\PowerShell.zip"

#####################################################################

# Start from Microsoft's Windows Nano Server image for LTSC 2019
FROM mcr.microsoft.com/windows/nanoserver:ltsc2019

# Configure the image
ARG NODEJS_VERSION=19.8.1 \
	NODEJS_DIRECTORY=C:\\NodeJS \
	POWERSHELL_DIRECTORY=C:\\PowerShell \
	APP_DIRECTORY=C:\\App

# Copy PowerShell from the previous step
COPY --from=powershell "${POWERSHELL_DIRECTORY}" "${POWERSHELL_DIRECTORY}"
SHELL [ "C:\\PowerShell\\pwsh.exe", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';" ]

# Download & extract Node.js
RUN Invoke-WebRequest -Uri "https://nodejs.org/dist/v${ENV:NODEJS_VERSION}/node-v${ENV:NODEJS_VERSION}-win-x64.zip" -OutFile "C:\\NodeJS.zip"; \
	Expand-Archive -Path "C:\\NodeJS.zip" -DestinationPath "C:\\NodeJS-Archive"; \
	Move-Item -Path "C:\\NodeJS-Archive\\node-v${ENV:NODEJS_VERSION}-win-x64" -Destination "${ENV:NODEJS_DIRECTORY}"; \
	Remove-Item -Path "C:\\NodeJS-Archive", "C:\\NodeJS.zip"

# Add Node.js & PowerShell to the system path, and set the Node.js environment
ENV PATH="${NODEJS_DIRECTORY};${POWERSHELL_DIRECTORY};C:\\Windows\\System32;C:\\Windows" \
	NODE_ENV=production

# Update NPM to the latest version
RUN npm install --global npm@latest; \
	npm cache clean --force; \
	Remove-Item -Recurse -Path ${ENV:LocalAppData}/npm-cache

# Create the directory for the project
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
