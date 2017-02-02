FROM node:6.9-alpine
MAINTAINER Ivan Erceg <ivan@softwaremarbles.com>

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh curl

ENV NODE_ENV=production

# It's not recommended to install yarn with npm but at the moment
# there are no other reliable alternatives for alpine.
RUN npm install --global yarn
ARG NPM_TOKEN
COPY package.json yarn.lock .npmrc /app/
WORKDIR /app/
RUN yarn

COPY . /app

STOPSIGNAL SIGINT
ENTRYPOINT ["node", "/app/index.js"]
