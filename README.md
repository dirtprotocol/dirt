
## Dependencies

- docker (https://docs.docker.com/install/)
- docker-compose (https://docs.docker.com/compose/install/)
- Node.js (https://nodejs.org/en/download/)

## Getting Started

Visit https://dev.dirtprotocol.com/docs/local-setup to try our Getting
Started tutorial.

## Commands

### `npm run deploy`

This will start a docker container running ganache at localhost:8545. It will
also deploy the DIRT smart contracts to this local ganache blockchain. After
the deploy is complete, the address of the root registry will be

`0x9938fd03d6d6d65280bf306f640570a8af6ac6fd`

You can also run `npm run deploy` to re-deploy the contracts after making
changes.

### `npm run pause`

This will stop Ganache but still preserve the state of the container so that
you don't have to redeploy the smart contracts.

### `npm run unpause`

This will unpause Ganache.

### `npm run rebuild`

After making changes to the code in `/packages`, run this command to rebuild
the `contracts` Docker container.
