import Web3 = require('web3')
import { Dirt, TokenValue, ChallengeableRegistry, VoteStyle } from "@dirt/lib";
import { Tx } from 'web3/eth/types';
import { TransactionReceipt } from 'web3/types';

const DIRT_CONTRACT_ADDRESS = '0xe00ac6b8538b241283d6dfa79e2de530294ff69f'
const WEB3_PROVIDER_URL = 'https://ropsten.infura.io/8CX4uOp5gT0N9ZhQ7NW1'

// Workaround for https://github.com/ethereum/web3.js/issues/1119
Web3.providers.HttpProvider.prototype.sendAsync = Web3.providers.HttpProvider.prototype.send
let web3 = new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER_URL))

let account = web3.eth.accounts.privateKeyToAccount('0xe25e8ae4aef86cb65c9475dc3a244ff281f12aac492e278e125fc4e204f8e140')

let growList = async () => {
  let dirt = await Dirt.create({
    rootAddress: DIRT_CONTRACT_ADDRESS,
    web3: web3
  })

  // Create Dataset and fetch its address
  let createDsTx = dirt.Root.createTx('Creators of Programming Languages ' + Date.now().toString(), VoteStyle.Public, 1, 1)
  let receipt = await executeTx(createDsTx)
  let log = receipt.logs[0]
  let createEvent = web3.eth.abi.decodeLog([
    { type: 'string', name: 'name' },
    { type: 'string', name: 'voteStyle' },
    { type: 'address', name: 'at' }
  ], log.data, log.topics)
  let registryAddress = createEvent['at']
  console.log('Registry created at address', registryAddress)

  let registry = await dirt.getRegistryAtAddress<ChallengeableRegistry>(
    registryAddress, ChallengeableRegistry)

  // Add an entry to the Dataset
  let addTx = registry.addItemTx('Python', 'Guido van Rossum', TokenValue.from(1), account.address)
  let addReceipt = await executeTx(addTx)
  console.log(addReceipt)
}

let executeTx = async (tx: Tx) : Promise<TransactionReceipt> => {
  console.log(tx)
  // Sign the transaction
  let signedTransaction = await account.signTransaction({
    nonce: await web3.eth.getTransactionCount(account.address),
    gas: 5000000,
    gasPrice: await web3.eth.getGasPrice(),
    to: tx.to,
    data: tx.data
  })

  // Send the transaction
  let receipt = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction)
  return receipt
}

growList()
