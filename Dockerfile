FROM node:14-alpine

WORKDIR /app

COPY . /app

RUN npm ci

EXPOSE 8080

CMD [ "node", "server.js" ]