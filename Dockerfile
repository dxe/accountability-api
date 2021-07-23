FROM node:14-alpine

WORKDIR /app

COPY . /app

RUN apk update
RUN apk upgrade
RUN apk add ca-certificates && update-ca-certificates
RUN apk add --update tzdata
ENV TZ=US/Pacific
RUN rm -rf /var/cache/apk/*

RUN npm ci

EXPOSE 8080

CMD [ "node", "server.js" ]