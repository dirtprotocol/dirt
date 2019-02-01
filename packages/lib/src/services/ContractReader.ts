import * as Web3 from 'web3';

import { IContractConfiguration } from '../contracts/IContract';
import { StaticContractProvider } from './StaticContractProvider';
import { Contract } from '../contracts/Contract';
import { Dirt } from './Dirt';

export interface IContractProvider {
    get(provider: Web3.Provider, name: string, address?: string): Promise<any>;
}

export class ContractReader {

    private dirt : Dirt
    public web3: Web3 = null;
    private contractCache: Map<string, any> = new Map();
    private instanceCache: Map<string, any> = new Map();

    constructor(dirt: Dirt, private web3Instance: Web3, private contractProvider?: IContractProvider) {
        this.dirt = dirt
        this.web3 = web3Instance
        this.contractProvider = contractProvider || new StaticContractProvider();
    }

    async getContract<T extends Contract>(config: IContractConfiguration): Promise<T> {
        let key = config.name + (config.address || 'DEFAULT');

        if (this.instanceCache.has(key)) {
            return this.instanceCache.get(key);
        }

        config.instance = config.instance || await this.getContractInstance(config.name, config.address);
        let instance = new config.type(this.dirt, config) as T;

        if (instance.init) {
            await instance.init();
        }

        this.instanceCache.set(key, instance);

        return instance;
    }

    async getContractInstance<T>(name: string, address?: string): Promise<T> {
        let key = name + (address || 'DEFAULT');

        if (this.contractCache.has(key)) {
            return this.contractCache.get(key) as T;
        }

        let instance: any = await this.contractProvider.get(this.web3.currentProvider, name, address);

        this.contractCache.set(key, instance);

        return instance as T;
    }
}
