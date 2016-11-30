FROM node:6.9.1-alpine
WORKDIR /app
ARG NPM_TOKEN
COPY . /app
RUN npm install
ENTRYPOINT ["node", "/app/index.js"]
