import * as Web3 from 'web3';

import {ContractInstance} from '../services/ContractReader';
import {Dirt} from '../services/Dirt';
import {DirtTrace} from '../services/DirtTrace';

// Base Contract convenience class that all other contract classes derive from.
export abstract class Contract {
  /**
   * Address of this contract on blockchain.
   */
  address: string;

  /**
   * Smart contract instance.
   */
  instance: ContractInstance;
  protected name: string;
  protected trace: DirtTrace;
  /** @internal */
  /** @hidden */
  dirt: Dirt

  /** @internal */
  /** @hidden */
  constructor(dirt: Dirt, instance: ContractInstance) {
    this.dirt = dirt
    this.instance = instance;
    this.trace = dirt.trace.create(this.instance.address);
  }

  /** @internal */
  /** @hidden */
  async init(): Promise<void> {
    this.address = this.instance.address;
    this.name = this.instance.address;
  }

  protected async dispatchCall(func: string, ...args: any[]) {
    const f = this.instance[func];
    if (!f) {
      throw new MissingContractFunctionError(func, this.name, this.instance);
    }

    if (!f.call) {
      throw new MissingContractFunctionError(
          func + '.call', this.name, this.instance);
    }

    try {
      return await f.apply(this.instance, args);
    } catch (e) {
      throw (await this.buildError(func, e));
    }
  }

  private async buildError(name: string, ex: Error):
      Promise<ContractDispatchError> {
    const block =
        this.dirt.web3.eth.getBlock(this.dirt.web3.eth.blockNumber, true);
    return new ContractDispatchError(
        name, this.name, ex.message, block.transactions);
  }
}


function formatDispatch(
    functionName: string, contract: string, inner: any,
    tx: Web3.Transaction[]): string {
  let message =
      `Dispatching function '${functionName}' on contract '${contract}'`;

  if (inner) {
    message += `\nInner Error: ${inner.toString()}`;
  }

  if (tx && tx.length > 0) {
    message += `\nTransactions: `;

    for (const t of tx) {
      message += `\n   ${t.hash}: ${t.from} -> ${t.to}`;
    }
  }

  return message;
}

export class ContractDispatchError extends Error {
  constructor(
      functionName: string, contract: string, inner: string,
      tx: Web3.Transaction[]) {
    super(formatDispatch(functionName, contract, inner, tx));
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MissingContractFunctionError extends Error {
  constructor(functionName: string, contract: string, instance: any) {
    super(`Missing dispatch function '${functionName}' on contract '${
        contract}'`);
    Object.setPrototypeOf(this, new.target.prototype);
    console.dir(instance);
  }
}
