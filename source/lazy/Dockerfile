FROM node:6.9-alpine
MAINTAINER Ivan Erceg <ivan@softwaremarbles.com>
RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh
WORKDIR /app
STOPSIGNAL SIGINT
COPY . /app
ENV NODE_ENV=production
ARG NPM_TOKEN
RUN npm install
ENTRYPOINT ["node", "/app/index.js"]
