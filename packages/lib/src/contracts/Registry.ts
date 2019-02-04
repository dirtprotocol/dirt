import {Tx} from 'web3/eth/types';

import {AsyncEnumerator, IAsyncEnumerableSource} from '../util/AsyncEnumerator';

import {Contract} from './Contract';

/**
 * Base registry item object.
 */
export interface RegistryItem {
  origin: string;
  key: string;
  owner: string;
  value: string;
  timestamp: number;
}

export abstract class Registry<TItem> extends Contract implements
    IAsyncEnumerableSource<TItem> {
  has(key: string): Promise<boolean> {
    return this.instance.hasItem.call(key);
  }

  /**
   * @returns Total number of items in the registry.
   */
  async count(): Promise<number> {
    const raw = await this.instance.getItemCount.call();
    return raw.toNumber();
  }

  /**
   * @param key Key of item to fetch.
   * @returns Registry item stored with the specified key.
   */
  abstract item(key: string): Promise<TItem>;

   /**
   * @param index Registry index of item to fetch.
   * @returns Registry item at specified index.
   */
  abstract itemAtIndex(index: number): Promise<TItem>;

  /**
   * Creates a `deleteItem` transaction.
   * @param key 
   */
  deleteItemTx(key: string): Tx {
    return this.instance.deleteItem.request(key).params[0];
  }

  /**
   * Sends a `deleteItem` transaction.
   * @param key Key of item to delete.
   */
  async deleteItem(key: string): Promise<boolean> {
    const tx = this.deleteItemTx(key);
    return this.dirt.sendTransaction(tx);
  }

  /**
   * @returns Enumerator for the registry items.
   */
  getEnumerator(): AsyncEnumerator<TItem> {
    return new AsyncEnumerator<TItem>(this);
  }
}
