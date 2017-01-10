FROM node:6.9.1-alpine
MAINTAINER Ivan Erceg <ivan@softwaremarbles.com>
WORKDIR /app
STOPSIGNAL SIGINT
COPY . /app
ENV NODE_ENV=production
RUN npm install
ENTRYPOINT ["node", "/app/index.js"]
