
# DIRT Protocol
Welcome to DIRT! See the official [DIRT developer website](https://dev.dirtprotocol.com) for the full documentation.

* [Overview](#Overview)
* [Repo Structure](#Repo-structure)
* [Requirements](#Requirements)
* [Getting started](#Getting-started)
* [Documentation](#Documentation)
* [Contributing](#Contributing)
* [License](#license)

## Overview
DIRT builds on the ideas of a Token Curated Registry (TCR) and allows anyone to deploy a datastore on Ethereum that is openly editable. We call this a Community Moderated Datastore (CMD) because there is no owner. Similar to a wiki, anyone can make changes to a CMD. DIRT defines a protocol for how data can be written and edited that uses token staking to maintain overall data quality.  

How the CMD protocol works: 
* Write data: users write to a CMD by staking tokens. The required token stake is unique to each datastore and set at the time of creation.
* Edit data: changes are decided through community moderation. To propose a change to a CMD, requesters need to stake tokens to start a vote. DIRT token holders can then vote to accept or reject the proposal. After the vote ends, voters in the majority earn tokens while those in the minority are penalized.

How to set up a CMD with DIRT:  
By using DIRT, you can deploy a CMD and store data on Ethereum network without needing to know solidity or to deploy a smart contract. To create a CMD, you need to define two parameters - number of tokens needed to write to the datastore and voting style (public or blind votes). Our smart contracts handle the deployment of the datastore on Ethereum and returns the Ethereum address of the datastore for you to access the data.   

## Repo structure

This repository is a monorepo that includes the DIRT smart contracts and developer tools. 

* contracts - smart contracts. Deployed on Ropsten testnet.
* contracts-test - tests for the smart contracts
* lib - typescript library for interacting with the smart contracts. This is published as an (npm package under dirt lib)[https://www.npmjs.com/package/@dirt/lib]

## Requirements
To set up our smart contracts.
* docker (https://docs.docker.com/install/)
* docker-compose (https://docs.docker.com/compose/install/)
* Node.js (https://nodejs.org/en/download/)

 We provide a full stack of developer tools including a typescript client library and dockerized ganache so you can integrate DIRT into your application in under five minutes. 

## Getting started

Visit https://dev.dirtprotocol.com/docs/local-setup to deploy a datastore in under 5 minutes. We provide a typescript library that wraps our smart contract logic to make it even easier to get started. 

## Documentation
The full documentation can be found on [DIRT's developer website](https://dev.dirtprotocol.com). 

## Contributing
DIRT is opensource and we welcome your pull requests. Here are some links to our communication channels to participate:

Website: https://dev.dirtprotocol.com
Twitter: https://twitter.com/dirtprotocol
Reddit: https://reddit.com/dirtprotocol

Share what you've built with DIRT! Tweet or email us at <hello@dirtprotocol.com>.

## License
MIT