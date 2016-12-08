FROM node:6.9.1-alpine
MAINTAINER Ivan Erceg <ivan@softwaremarbles.com>
ARG NPM_TOKEN
WORKDIR /app
COPY . /app
RUN npm install
LABEL "io.lazyass.lazy.engine.languages"="C, C++, Objective-C, Objective-C++"
ENTRYPOINT ["node", "/app/emcc-engine.js"]
