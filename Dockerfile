# syntax=docker/dockerfile:1

# Start from my Node.js image (Ubuntu-based)
FROM ghcr.io/viral32111/nodejs:19-ubuntu

# Configure the directory for the project
ARG APP_DIRECTORY=/usr/local/app

# Create the directory for the project
RUN mkdir --verbose --parents ${APP_DIRECTORY}
WORKDIR ${APP_DIRECTORY}

# Add package files & JavaScript code
COPY --chown=${USER_ID}:${USER_ID} ./package.json ${APP_DIRECTORY}/package.json
COPY --chown=${USER_ID}:${USER_ID} ./package-lock.json ${APP_DIRECTORY}/package-lock.json
COPY --chown=${USER_ID}:${USER_ID} ./dist/ ${APP_DIRECTORY}/dist/

# Install production dependencies
RUN npm install --omit=dev

# Launch the project
ENTRYPOINT [ "node", "." ]
