FROM node:alpine

WORKDIR /app

ARG ACTIVE_ENV
ENV ACTIVE_ENV=$ACTIVE_ENV
ENV NODE_ENV=$ACTIVE_ENV
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN echo $ACTIVE_ENV

COPY . /app/.

RUN if [ "$ACTIVE_ENV" = "prod" ]; then rm /app/src/.well-known/smart/manifest.json; mv /app/src/.well-known/smart/manifest.prod.json /app/src/.well-known/smart/manifest.json; fi

RUN npm install
RUN npm install -g @angular/cli

COPY .angular-cli.json /app/.angular-cli.json

RUN if [ "$ACTIVE_ENV" = "prod" ]; then ng build --env=prod; else ng build; fi
CMD ["node", "server.js"]
