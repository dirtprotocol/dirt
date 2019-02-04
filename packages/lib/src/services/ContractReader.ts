import * as DirtAbi from '@dirt/contracts';
import * as Web3 from 'web3';

import {Contract} from '../contracts/Contract';

import {Dirt} from './Dirt';

import contract = require('truffle-contract');
import {RootRegistry, Parameters, Token, PublicVoteController, CommitRevealVoteController, LockedCommitRevealVoteController, ChallengeableRegistry, StakableRegistry, Faucet} from '../contracts';

/** @internal */
export {ContractInstance, ContractReader, IContractConfiguration};

interface ContractInstance {
  [key: string]: any;
}

type ContractClass = new (dirt: Dirt, instance: ContractInstance) => Contract;

interface IContractConfiguration {
  type: ContractClass;
  address?: string;
}

const CONTRACT_CLASS_TO_NAME: Map<ContractClass, string> = (() => {
  const CONTRACT_CLASSES = [
    [RootRegistry, 'RootRegistry'],
    [Parameters, 'Parameters'],
    [Token, 'ProtocolToken'],
    [ChallengeableRegistry, 'ChallengeableRegistry'],
    [StakableRegistry, 'StakableRegistry'],
    [PublicVoteController, 'PublicVoteController'],
    [CommitRevealVoteController, 'CommitRevealVoteController'],
    [LockedCommitRevealVoteController, 'LockedCommitRevealVoteController'],
    [Faucet, 'Faucet'],
  ];
  const map = new Map();
  for (const cc of CONTRACT_CLASSES) {
    map.set(cc[0] as ContractClass, cc[1] as string);
  }
  return map;
})();

class ContractReader {
  dirt: Dirt;
  web3: Web3 = null;
  contractCache: Map<string, ContractInstance> = new Map();
  wrapperCache: Map<string, Contract> = new Map();

  constructor(dirt: Dirt, web3Instance: Web3) {
    this.dirt = dirt;
    this.web3 = web3Instance;
  }

  async getContract<T extends Contract>(config: IContractConfiguration):
      Promise<T> {
    const name = CONTRACT_CLASS_TO_NAME.get(config.type);
    if (!name) {
      throw new Error('Cannot lookup contract name');
    }
    const key = name + (config.address || 'DEFAULT');

    if (this.wrapperCache.has(key)) {
      return this.wrapperCache.get(key) as T;
    }

    const contractInstance =
        await this.getContractInstance(name, config.address);
    const instance = new config.type(this.dirt, contractInstance) as T;

    if (instance.init) {
      await instance.init();
    }

    this.wrapperCache.set(key, instance);

    return instance;
  }

  async getContractInstance(name: string, address?: string):
      Promise<ContractInstance> {
    const key = name + (address || 'DEFAULT');

    if (this.contractCache.has(key)) {
      return this.contractCache.get(key);
    }

    const instance = await this.getContractAbi(name, address);

    this.contractCache.set(key, instance);

    return instance;
  }

  private async getContractAbi(name: string, address?: string):
      Promise<ContractInstance> {
    const abi = DirtAbi.contracts[name];
    if (!abi) {
      throw new Error(`Missing ABI export for ${name}`);
    }

    const abiWrapper = contract(abi);
    abiWrapper.setProvider(this.web3.currentProvider);

    console.log(`${name} @ ${address}`);

    return address ? abiWrapper.at(address) : abiWrapper.deployed();
  }
}
