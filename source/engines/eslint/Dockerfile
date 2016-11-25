FROM node:6.9.1-alpine
MAINTAINER Ivan Erceg <ivan@softwaremarbles.com>
WORKDIR /app
COPY . /app
RUN npm install
ENTRYPOINT ["node"]
CMD ["eslint-server.js"]
