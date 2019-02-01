import {
    IContractConfiguration
} from './IContract';

import {
    Dirt,
    DirtTrace
} from '../services/Dirt';
import * as Web3 from 'web3';

function formatDispatch(functionName: string, contract: string, inner: any, tx: Web3.Transaction[]): string {
    let message = `Dispatching function '${functionName}' on contract '${contract}'`;

    if (inner) {
        message += `\nInner Error: ${inner.toString()}`;
    }

    if (tx && tx.length > 0) {
        message += `\nTransactions: `;

        for (let t of tx) {
            message += `\n   ${t.hash}: ${t.from} -> ${t.to}`
        }
    }

    return message;
}

export class ContractDispatchError extends Error {
    constructor(functionName: string, contract: string, inner: string, tx: Web3.Transaction[]) {
        super(formatDispatch(functionName, contract, inner, tx));
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class MissingContractFunctionError extends Error {
    constructor(functionName: string, contract: string, instance: any) {
        super(`Missing dispatch function '${functionName}' on contract '${contract}'`);
        Object.setPrototypeOf(this, new.target.prototype);
        console.dir(instance);
    }
}

export abstract class Contract {

    protected trace: DirtTrace;
    public address: string;
    public instance: any;
    public name: string;
    private errorAddresses: Set<string> = new Set();
    private errorSources: Set<string> = new Set();

    constructor(public dirt: Dirt, protected config: IContractConfiguration) {
        this.instance = config.instance;
        this.trace = dirt.trace.create(this.instance.address);
    }

    async init(): Promise<void> {
        this.address = this.instance.address;
        this.name = this.instance.address;
        this.errorSources.add(this.address);
        this.errorAddresses.add(this.address);
    }

    protected async dispatchCall(func: string, ...args: any[]) {
        let f = this.getFunc(func);

        if (!f.call) {
            throw new MissingContractFunctionError(func + ".call", this.name, this.instance);
        }

        return await this.wrapExecution(func, () => f.apply(this.instance, args));
    }

    private getFunc(func: string, throwIfMissing: boolean = true): Function {
        if (!this.instance[func] && throwIfMissing) {
            throw new MissingContractFunctionError(func, this.name, this.instance);
        }

        return this.instance[func];
    }

    private async wrapExecution(funcName: string, promise: () => Promise<any>): Promise<any> {
        try {
            return await promise();
        } catch (e) {
            throw (await this.buildError(funcName, e));
        }
    }

    private async buildError(name: string, ex: Error): Promise<ContractDispatchError> {
        let block = this.dirt.web3.eth.getBlock(this.dirt.web3.eth.blockNumber, true);
        return new ContractDispatchError(name, this.name, ex.message, block.transactions);
    }
}