FROM node:8.12-alpine as builder

ARG NPM_TOKEN
COPY .npmrc .npmrc
COPY package*.json ./

# install only production in production
RUN npm install --registry https://registry.thatiq.com && \
  npm cache clean --force && \
  rm -f .npmrc

FROM node:8.12-alpine

ENV THATIQ_HOME /usr/local/thatiq

WORKDIR $THATIQ_HOME
ADD . $THATIQ_HOME

# COPY
COPY --from=builder package*.json $THATIQ_HOME/
COPY --from=builder node_modules $THATIQ_HOME/node_modules/

CMD ["/usr/local/thatiq/node_modules/.bin/nodemon","--watch","app","--watch","conf","--watch","web","-e","js,scss,conf,html","-x","/usr/local/thatiq/node_modules/.bin/cross-env BABEL_ENV=esnext rollup --silent -c && /usr/local/thatiq/bin/thatiq rs /usr/local/thatiq/conf/dev.conf"]
