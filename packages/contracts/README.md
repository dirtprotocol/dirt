# Entity Protocol Smart Contracts 

## Development Environment Setup 

### Repo setup

```sh
cd ./src
npm install

# Optional, to check your environment 
npm run compile
```
## Developer Workflow
See `contract-dev.md` in `doc`.

## Metamask 

Don't use metamask against local test net, it will hang on transactions. Right now web-ui is pointing to the test-rpc port directly. 

  - Add local testnet to metamask, Go to Settings -> New RPC URL -> and add  
     "http://localhost:9545"
  - Switch metamask to use this network 
  - From the output from `truffle develop` you will see private keys, import     the first (account 0) private key into metamask 
   - Switch to that account, and reload 'http://localhost:3000'
   - To validate you see the a token balance of *3,000,000*

## Running Tests 

See `contracts-test` package

### Test RPC 
 - Run `npm run develop` in a separate command window
 - Run `npm run test`

 ### Ganache
  - Run ganache
  - run `npm run test_ganache` 