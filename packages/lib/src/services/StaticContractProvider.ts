import { IContractProvider } from './ContractReader';
import * as DefaultAbi from "@dirt/contracts";
import * as Web3 from 'web3';
import contract = require('truffle-contract');

export class StaticContractProvider implements IContractProvider {

    async get(web3Provider: Web3.Provider, name: string, address?: string): Promise<any> {
        let abi = DefaultAbi.contracts[name];

        if(!abi) {
            throw new Error(`Missing ABI export for ${name}`);
        }

        let abiWrapper = contract(abi);
        abiWrapper.setProvider(web3Provider);

        console.log(`${name} @ ${address}`);

        return address ? abiWrapper.at(address) : abiWrapper.deployed();
    }

}