FROM getlazy/node-strategy-engine:latest
MAINTAINER The lazy Authors <team@getlazy.org>

ENV NODE_ENV=production

ARG NPM_TOKEN

COPY . /strategy
WORKDIR /strategy/
RUN yarn --pure-lockfile

# Now set the workdir to strategy engine's workdir
WORKDIR /app/
