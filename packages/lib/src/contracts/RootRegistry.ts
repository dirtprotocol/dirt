import { CallTxDataBase, Transaction, TxData } from 'web3';
import { Tx } from 'web3/eth/types';

import { IAsyncEnumerableSource } from '../util/AsyncEnumerator';

import { Registry } from './Registry';
import { TokenValue } from './Token';

/**
 * Describes items stored in the `RootRegistry`.
 */
export class RegistryDescriptor {
  name: string;
  address: string;
  voteStyle: string;
  timestamp: number;
}

export interface IKnownAddresses {
  parameters: string;
  self: string;
}

export enum VoteStyle {
  Public = 'PUBLIC',
  CommitReveal = 'COMMIT_REVEAL',
  LockedCommitReveal = 'LOCKED_COMMIT_REVEAL'
}

/**
 * Convenience class for `RootRegistry.sol`.
 */
export class RootRegistry extends Registry<RegistryDescriptor> implements
  IAsyncEnumerableSource<RegistryDescriptor> {
  addresses: IKnownAddresses = null;

  /** @internal */
  /** @hidden */
  async init(): Promise<void> {
    await super.init();

    this.addresses = {
      self: this.address,
      parameters: await this.dispatchCall('parametersAddress'),
    };
  }

  async item(name: string): Promise<RegistryDescriptor> {
    const raw = await this.instance.getItem(name);
    return this.unpack([name, ...raw]);
  }

  async itemAtIndex(index: number): Promise<RegistryDescriptor> {
    const raw = await this.instance.getAtIndex(index);
    return this.unpack(raw);
  }

  createTx(
    name: string, style: VoteStyle, minWriteStake: number,
    minVoteStake: number): Tx {
    if (!name || name.length == 0) {
      throw new Error('Name must be defined');
    } else if (!style || style.length == 0) {
      throw new Error('Vote style must be defined');
    }

    // TODO: This sucks, needs to be tuned
    this.trace.message(
      `Creating registry ${name} with vote style ${style} with writeStake ${
      minWriteStake} with minVoteStake ${minVoteStake}`);

    const minWriteStakeRaw = TokenValue.from(minWriteStake).raw;
    const minVoteStakeRaw = TokenValue.from(minVoteStake).raw;

    const request = this.instance.create.request(
      name, style, minWriteStakeRaw, minVoteStakeRaw);
    return request.params[0];
  }

  // TODO minStake amounts probably aren't optional
  async create(
    name: string, style: VoteStyle, minWriteStake: number,
    minVoteStake: number): Promise<RegistryDescriptor> {
    if (!name || name.length == 0) {
      throw new Error('Name must be defined');
    } else if (!style || style.length == 0) {
      throw new Error('Vote style must be defined');
    }

    // TODO: This sucks, needs to be tuned
    this.trace.message(
      `Creating registry ${name} with vote style ${style} with writeStake ${
      minWriteStake} with minVoteStake ${minVoteStake}`);

    const minWriteStakeRaw = TokenValue.from(minWriteStake).raw;
    const minVoteStakeRaw = TokenValue.from(minVoteStake).raw;

    await this.instance.create(
      name, style, minWriteStakeRaw, minVoteStakeRaw, { from: this.dirt.defaultAccount(), gas: 5000000 });

    return await this.item(name);
  }

  private unpack(values: any[]) {
    return {
      name: values[0],
      address: values[1],
      voteStyle: values[2],
      timestamp: values[3]
    };
  }
}
