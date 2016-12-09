FROM node:6.9.1-alpine
MAINTAINER Ivan Erceg <ivan@softwaremarbles.com>
ARG NPM_TOKEN
STOPSIGNAL SIGTERM
WORKDIR /app
COPY . /app
RUN npm install
LABEL "io.lazyass.lazy.engine.languages"="JavaScript"
ENTRYPOINT ["node", "/app/index.js"]
