FROM node:6.9.1-alpine
MAINTAINER Ivan Erceg <ivan@softwaremarbles.com>
ARG NPM_TOKEN
WORKDIR /app
COPY . /app
RUN npm install
ENTRYPOINT ["node", "/app/eslint-server.js"]
