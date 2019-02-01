FROM node:10.14.2-alpine

RUN apk add --no-cache git python build-base bash

WORKDIR /usr/src

RUN npm install -g pnpm

COPY ./package.json ./package.json
COPY ./.npmrc ./.npmrc
COPY ./pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY ./packages/contracts/package.json ./packages/contracts/package.json
COPY ./packages/contracts/shrinkwrap.yaml ./packages/contracts/shrinkwrap.yaml
COPY ./packages/contracts-test/package.json ./packages/contracts-test/package.json
COPY ./packages/contracts-test/shrinkwrap.yaml ./packages/contracts-test/shrinkwrap.yaml
COPY ./packages/lib/package.json ./packages/lib/package.json
COPY ./packages/lib/shrinkwrap.yaml ./packages/lib/shrinkwrap.yaml
RUN pnpm recursive install -s

COPY ./packages/contracts ./packages/contracts
COPY ./packages/contracts-test ./packages/contracts-test
COPY ./packages/lib ./packages/lib

WORKDIR packages/contracts-test
