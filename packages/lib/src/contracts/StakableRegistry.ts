import { Registry, RegistryItem } from './Registry';
import { TokenValue } from './Token';
import { Tx } from 'web3/eth/types';
import { TxData } from 'web3';

export class StakableRegistryItem extends RegistryItem {
  constructor(
    origin,
    key,
    owner,
    value,
    timestamp,
    public stake: TokenValue
  ) {
    super(origin, key, owner, value, timestamp);
  }
}

export abstract class BaseStakableRegistry<TItem extends StakableRegistryItem = StakableRegistryItem> extends Registry<TItem> {
  public minimumStake: TokenValue;

  async init(): Promise<void> {
    await super.init();

    this.minimumStake = TokenValue.fromRaw(
      await this.instance.minStakeValue.call()
    );
  }

  async depositBalanceOf(address?: string): Promise<TokenValue> {
    address = address || this.dirt.defaultAccount();
    let raw = await this.instance.depositBalanceOf.call(address);
    return TokenValue.fromRaw(raw);
  }

  async item(key: string): Promise<TItem> {
    let raw = await this.instance.getItemWithStake.call(key);
    return await this.unpack([key, ...raw]);
  }

  async itemAtIndex(index: number): Promise<TItem> {
    let raw = await this.instance.getAtIndexWithStake.call(index);
    return await this.unpack(raw);
  } 

  addItemTx(key: string, value: string, stake: TokenValue, account: string): Tx {
    stake = stake || TokenValue.from(0);

    const abiEncodedAddItemCall = this.instance.contract.addItem.getData(
      key, value, stake.raw, account
    );
    return this.dirt.Token.instance.approveAndCall.request(
      this.address, stake.raw, abiEncodedAddItemCall
    ).params[0]
  }

  async addItem(
    key: string,
    value: string,
    stake: TokenValue,
    addItemSuccessCallback: () => void,
    addItemFailureCallback: () => void
  ): Promise<TItem> {
    try {
      let tx = this.addItemTx(key, value, stake, this.dirt.defaultAccount())
      await this.dirt.sendTransaction(<TxData> tx)

      if (addItemSuccessCallback)
        addItemSuccessCallback()
    } catch (e) {
      if (addItemFailureCallback)
        addItemFailureCallback()
      throw e
    }
    
    return this.item(key)
  }

  protected abstract async unpack(value: any[]): Promise<TItem>;
}

export class StakableRegistry extends BaseStakableRegistry {
  protected unpack(value: any[]): Promise<StakableRegistryItem> {
    let unpacked = new StakableRegistryItem(
      this.address,
      value[0],
      value[1],
      value[2],
      value[3].toNumber(),
      TokenValue.fromRaw(value[4])
    );

    return Promise.resolve(unpacked);
  }
}
