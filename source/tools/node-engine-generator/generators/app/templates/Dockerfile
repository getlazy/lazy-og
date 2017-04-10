FROM node:6.9-alpine
MAINTAINER <%= author %> 
ARG NPM_TOKEN
STOPSIGNAL SIGTERM
WORKDIR /app
COPY . /app
RUN npm install
ENTRYPOINT ["node", "/app/index.js"]
