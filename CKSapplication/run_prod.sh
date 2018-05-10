#!/usr/bin/env bash

export NODE_ENV=prod
export NODE_TLS_REJECT_UNAUTHORIZED=0

npm install -g @angular/cli
npm install
ng build --prod
forever start server.js
