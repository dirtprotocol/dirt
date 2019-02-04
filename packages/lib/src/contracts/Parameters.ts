import {Contract} from './Contract';

export enum KnownClasses {
  CORE = 'CORE',
  REGISTRY = 'REGISTRY',
  VOTE = 'VOTE'
}

export enum KnownCoreParameters {
  TOKEN = 'TOKEN',
  ROOT = 'ROOT',
}

export enum KnownVoteParameters {
  PUBLIC = 'PUBLIC',
  COMMIT_REVEAL = 'COMMIT_REVEAL',
  LOCKED_COMMIT_REVEAL = 'LOCKED_COMMIT_REVEAL',
}

/**
 * Stores addresses to other DIRT contracts, parameters, and settings.
 * Convenience class for `Parameters.sol`
 */
export class Parameters extends Contract {
  getAddress(className: KnownClasses|string, key: string): Promise<string> {
    return this.instance.getAddress.call(className, key);
  }

  async setAddress(
      className: KnownClasses|string, key: string,
      address: string): Promise<void> {
    await this.instance.setAddress(className, key, address);
  }
}
