import {Contract} from './Contract';

/**
 * Convenience class for `Faucet.sol`. Testnet only.
 */
/** @internal */
/** @hidden */
export class Faucet extends Contract {
  async give(): Promise<boolean> {
    return this.instance.give({from: this.dirt.defaultAccount()});
  }
}
