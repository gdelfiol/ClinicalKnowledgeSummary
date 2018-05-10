#!/usr/bin/env bash

docker build --build-arg ACTIVE_ENV=local -t cks-image/knowledgesummary .
docker run -p 3000:3000 cks-image/knowledgesummary
