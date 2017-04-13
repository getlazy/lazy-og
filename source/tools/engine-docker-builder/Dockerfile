FROM ierceg/node-dev:6.10
MAINTAINER The lazy Authors <team@getlazy.org>

ENV NODE_ENV=production
ARG NPM_TOKEN
COPY . /app
WORKDIR /app/
RUN yarn --pure-lockfile

STOPSIGNAL SIGINT
ENTRYPOINT ["node", "/app/index.js"]
