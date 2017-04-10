FROM node:6.10-alpine
MAINTAINER The lazy Authors <team@getlazy.org>
ARG NPM_TOKEN
STOPSIGNAL SIGTERM
WORKDIR /app
COPY . /app
RUN npm install
ENTRYPOINT ["node", "/app/index.js"]
