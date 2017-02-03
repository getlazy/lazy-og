FROM node:6.9-alpine
MAINTAINER lazy team <team@getlazy.org>

WORKDIR /app
COPY . /app

ENV NODE_ENV=production
ARG NPM_TOKEN
RUN npm install

STOPSIGNAL SIGTERM
ENTRYPOINT ["node", "/app/index.js"]
