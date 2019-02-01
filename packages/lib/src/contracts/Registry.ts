import { Contract } from "./Contract";
import {
  AsyncEnumerator,
  IAsyncEnumerableSource
} from "../util/AsyncEnumerator";
import { Tx } from 'web3/eth/types';

export class RegistryItem {
  constructor(
    public origin: string,
    public key: string,
    public owner: string,
    public value: string,
    public timestamp: number
  ) {}
}

export abstract class Registry<T> extends Contract
  implements IAsyncEnumerableSource<T> {
  has(key: string): Promise<boolean> {
    return this.instance.hasItem.call(key);
  }

  async count(): Promise<number> {
    let raw = await this.instance.getItemCount.call();
    return raw.toNumber();
  }

  abstract item(key: string): Promise<T>;

  abstract itemAtIndex(index: number): Promise<T>;

  deleteItemTx(key: string): Tx {
    return  this.instance.deleteItem.request(key).params[0];
  }

  async deleteItem(key: string): Promise<boolean> {
    let tx = this.deleteItemTx(key)
    return this.dirt.sendTransaction(tx)
  }

  getEnumerator(): AsyncEnumerator<T> {
    return new AsyncEnumerator<T>(this);
  }
}
