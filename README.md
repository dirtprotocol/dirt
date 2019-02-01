
## Dependencies

- docker (https://docs.docker.com/install/)
- docker-compose (https://docs.docker.com/compose/install/)

## Run DIRT on a local Ganache testnet

`npm run deploy`

This will start a docker container running ganache at localhost:7545. It will
also deploy the DIRT smart contracts to this local ganache network. After
the deploy is complete, the address of the root registry will be

`0x9938fd03d6d6d65280bf306f640570a8af6ac6fd`

You can also pause the ganache network with `npm run pause` and unpause
it again with `npm run unpause`. This will stop ganache but still preserve the
state of the container so that you don't have to redeploy the smart contracts.
If you do want to re-deploy the contracts, simply run `npm run deploy` again.
