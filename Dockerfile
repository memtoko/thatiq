FROM node:8.12-alpine as builder

ARG NPM_TOKEN
COPY .npmrc .npmrc
COPY package*.json ./

# install only production in production
RUN npm install --registry https://registry.thatiq.com && \
  npm cache clean --force && \
  rm -f .npmrc

FROM node:8.12-alpine


RUN apk add tini

ENV THATIQ_HOME="/usr/local/thatiq" \
  BABEL_ENV="esnext"

WORKDIR $THATIQ_HOME
ADD . $THATIQ_HOME

# COPY
COPY --from=builder package*.json $THATIQ_HOME/
COPY --from=builder node_modules $THATIQ_HOME/node_modules/

CMD tini -- $THATIQ_HOME/node_modules/.bin/nodemon --watch app --watch conf \
  --watch web -e "js,scss,conf,html" \
  -x $THATIQ_HOME/bin/thatiq rs $THATIQ_HOME/conf/dev.conf
