FROM node:6.9-alpine
MAINTAINER lazy team <team@getlazy.org>

# It's not recommended to install yarn with npm but at the moment
# there are no other reliable alternatives for alpine.
ENV NODE_ENV=production
ARG NPM_TOKEN
# We need yarn because eslint engine uses it during its runtime.
RUN npm install --global yarn

# yarn is so fast that there is no good reason to split copying package.json/yarn.yaml/.npmrc
# and the rest of the sources to get marginal build performance improvements. On the other hand
# having less layers in a Docker image is beneficial for runtime performance.
COPY . /app
WORKDIR /app/
RUN yarn

STOPSIGNAL SIGINT
ENTRYPOINT ["node", "/app/index.js"]
