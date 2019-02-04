
# DIRT Protocol
Welcome to DIRT! See the official [DIRT developer website](https://dev.dirtprotocol.com) for the full documentation.

* [Overview](#Overview)
* [Repo Structure](#Repo-structure)
* [Getting started](#Getting-started)
* [Documentation](#Documentation)
* [Contributing](#Contributing)
* [Faucet](#Faucet)
* [License](#license)

## Overview
DIRT allows anyone to deploy a datastore on Ethereum that is openly editable. We call this a Community Moderated Datastore (CMD) because there is no single owner. All the data is community owned and managed, and any service or application can use the data in a CMD. 

DIRT protocol helps communities maintain their CMD quality as follows:
* Write data: To write to a CMD, users stake tokens. The required token stake is unique to each datastore and set at the time of creation. As long as the data is saved in the datastore, the tokens are staked with the data. This prevents spam by requiring every writer to have skin in the game.
* Edit data: If someone comes across an error while using DIRT, they can flag the error and earn staked tokens for incorrect data as a bounty. Changes on DIRT are decided by token weighted votes. Any DIRT token holders can vote to accept or reject the proposal. After the vote ends, voters in the majority earn tokens while those in the minority are penalized.

## Repo structure

This repository is a monorepo with the following. 

* Contracts: Smart contracts that are currently deployed on Ropsten testnet.
* Contracts-test: Tests for the smart contracts
* Lib: TypeScript library for interacting with the smart contracts. This is available as the (DIRT npm package)[https://www.npmjs.com/package/@dirt/lib]
* Docker: Utility docker container to run a local Ethereum network for testing. Instructions for running the docker container are on (DIRT's developer portal)[https://dev.dirtprotocol.com].

## Getting started

Visit https://dev.dirtprotocol.com/docs/local-setup to deploy a CMD in under 5 minutes. 

## Documentation
The full documentation can be found on [DIRT's developer website](https://dev.dirtprotocol.com). 

## Faucet
Get DIRT tokens for Ropsten at the [DIRT faucet](https://faucet.dirtprotocol.com). 

## Contributing
DIRT is opensource and we welcome your pull requests. Here are some links to our communication channels to participate:

Website: https://dev.dirtprotocol.com
Twitter: https://twitter.com/dirtprotocol
Reddit: https://reddit.com/dirtprotocol

Share what you've built with DIRT! Tweet or email us at <hello@dirtprotocol.com>.

## License
MIT