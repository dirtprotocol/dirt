import {TxData} from 'web3';
import {Tx} from 'web3/eth/types';

import {Registry, RegistryItem} from './Registry';
import {TokenValue} from './Token';

export interface StakableRegistryItem extends RegistryItem {
  stake: TokenValue;
}

export abstract class BaseStakableRegistry<
    TItem extends StakableRegistryItem = StakableRegistryItem> extends
    Registry<TItem> {
  minimumStake: TokenValue;

  /** @internal */
  /** @hidden */
  async init(): Promise<void> {
    await super.init();

    this.minimumStake =
        TokenValue.fromRaw(await this.instance.minStakeValue.call());
  }

  async depositBalanceOf(address?: string): Promise<TokenValue> {
    address = address || this.dirt.defaultAccount();
    const raw = await this.instance.depositBalanceOf.call(address);
    return TokenValue.fromRaw(raw);
  }

  async item(key: string): Promise<TItem> {
    const raw = await this.instance.getItemWithStake.call(key);
    return await this.unpack([key, ...raw]);
  }

  async itemAtIndex(index: number): Promise<TItem> {
    const raw = await this.instance.getAtIndexWithStake.call(index);
    return await this.unpack(raw);
  }

  /**
   * Creates an `addItem` transaction to add a (key, value) pair to the registry.
   * @param key Unique key to store the item in the registry with.
   * @param value 
   * @param stake 
   * @param account 
   */
  addItemTx(key: string, value: string, stake: TokenValue, account: string):
      Tx {
    stake = stake || TokenValue.from(0);

    const abiEncodedAddItemCall =
        this.instance.contract.addItem.getData(key, value, stake.raw, account);
    return this.dirt.Token.instance.approveAndCall
        .request(this.address, stake.raw, abiEncodedAddItemCall, {
          from: this.dirt.defaultAccount(),
          gas: 5000000
        })
        .params[0];
  }

  /**
   * Send an `addItem` transaction.
   * For parameters, see `addItemTx()`
   */
  async addItem(
      key: string,
      value: string,
      stake: TokenValue,
      ): Promise<TItem> {
    stake = stake || TokenValue.from(0);

    const abiEncodedAddItemCall =
        this.instance.contract.addItem.getData(key, value, stake.raw, this.dirt.defaultAccount());
    await this.dirt.Token.instance.approveAndCall(this.address, stake.raw, abiEncodedAddItemCall, {
          from: this.dirt.defaultAccount(),
          gas: 5000000
        })
    return this.item(key);
  }

  /**
   * @param value Raw item from contract call to parse.
   * @returns Parsed registry item.
   */
  protected abstract async unpack(value: any[]): Promise<TItem>;
}

/**
 * Convenience class for `StakableRegistry.sol`
 */
export class StakableRegistry extends BaseStakableRegistry {
  protected unpack(value: any[]): Promise<StakableRegistryItem> {
    const unpacked = {
      origin: this.address,
      key: value[0],
      owner: value[1],
      value: value[2],
      timestamp: value[3].toNumber(),
      stake: TokenValue.fromRaw(value[4])
    };

    return Promise.resolve(unpacked);
  }
}
