import Web3 = require('web3')
import { Dirt, TokenValue, ChallengeableRegistry, VoteStyle } from "@dirt/lib";
var HDWalletProvider = require("truffle-hdwallet-provider")

const DIRT_CONTRACT_ADDRESS = '0xe00ac6b8538b241283d6dfa79e2de530294ff69f'
const WEB3_PROVIDER_URL = 'https://ropsten.infura.io/8CX4uOp5gT0N9ZhQ7NW1'


let web3 = new Web3(new HDWalletProvider('REPLACE_ME_WITH_PRIVATE_KEY', WEB3_PROVIDER_URL))
web3.eth.defaultAccount = '0x7f4344885ee55d27c8c41d8356001d5fd75b37e3'

let growList = async () => {
  let dirt = await Dirt.create({
    rootAddress: DIRT_CONTRACT_ADDRESS,
    web3: web3
  })

  // Create Dataset and fetch its address
  let newRegistry = await dirt.Root.create('Creators of Programming Languages ' + Date.now().toString(), VoteStyle.Public, 1, 1)
  console.log('Registry created at address', newRegistry.address)

  let registry = await dirt.getRegistryAtAddress<ChallengeableRegistry>(
      newRegistry.address, ChallengeableRegistry)

  // Add an entry to the Dataset
  let newItem = await registry.addItem('Python', 'Guido van Rossum', TokenValue.from(1))
  console.log(newItem)
}

growList()
