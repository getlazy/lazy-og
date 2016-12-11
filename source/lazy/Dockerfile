FROM node:6.9.1-alpine
MAINTAINER Ivan Erceg <ivan@softwaremarbles.com>
WORKDIR /app
ARG NPM_TOKEN
STOPSIGNAL SIGTERM
COPY . /app
# HACK: Replace it with parametrized passing of yaml name
COPY lazy-production.yaml /app/lazy.yaml
RUN npm install
ENTRYPOINT ["node", "/app/index.js"]
