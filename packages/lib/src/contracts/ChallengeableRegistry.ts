import {TxData} from 'web3';
import {Tx} from 'web3/eth/types';

import {AsyncEnumerator, IAsyncEnumerableSource} from '../util/AsyncEnumerator';

import {VoteConfiguration, Poll} from './BaseVote';
import {VoteStyle} from './RootRegistry';
import {BaseStakableRegistry, StakableRegistryItem} from './StakableRegistry';
import {TokenValue} from './Token';
import {VoteStyleFactory} from './VoteStyleFactory';

export interface ChallengeableRegistryItem extends StakableRegistryItem {
  voteId: number;
  voteContract: string;
}

export interface VoteInstanceDescriptor {
  address: string;
  voteId: number;
  pendingCreation: boolean;
}

export class VoteHistory implements IAsyncEnumerableSource<VoteInstanceDescriptor> {
  constructor(private instance: any, public stakeHolderAddr: string) {}

  async count(): Promise<number> {
    // deprecated
    throw new Error('deprecated');
    // let raw = await
    // this.instance.getVoteHistoryCount.call(this.stakeHolderAddr);
  }

  async itemAtIndex(index: number): Promise<VoteInstanceDescriptor> {
    const raw =
        await this.instance.getVoteHistory.call(this.stakeHolderAddr, index);
    return this.unpack(raw);
  }

  unpack(value: any[]): VoteInstanceDescriptor {
    return {address: value[0], voteId: value[1], pendingCreation: value[2]};
  }
}

export class ChallengeableRegistry extends
    BaseStakableRegistry<ChallengeableRegistryItem> {
  voteStyle: VoteStyle;
  voteConfiguration: VoteConfiguration;

  /** @internal */
  /** @hidden */
  async init(): Promise<void> {
    await super.init();

    this.voteStyle = await this.instance.voteStyle.call();
    this.voteConfiguration = await this.getVoteConfiguration();
  }

  /**
   * Returns the vote stake parameters.
   */
  async getVoteConfiguration(): Promise<VoteConfiguration> {
    const res = await this.instance.voteConfiguration.call();
    return {
      challengePenalty: res[1].toNumber(),
      votePenalty: res[2].toNumber(),
      challengeLength: res[3].toNumber(),
      challengeDistribution: res[4].toNumber(),
      minVoteStake: TokenValue.fromRaw(res[5]),
      minVoteIncrementalStake: TokenValue.fromRaw(res[6])
    };
  }

  protected async unpack(value: any[]): Promise<ChallengeableRegistryItem> {
    const unpacked = {
      origin: this.address,
      key: value[0],
      owner: value[1],
      value: value[2],
      timestamp: value[3].toNumber(),
      stake: TokenValue.fromRaw(value[4])
    };

    const [addr, id] = await this.instance.getActiveVote.call(unpacked.key);

    return {...unpacked, voteContract: addr, voteId: id};
  }

  /**
   * Creates a `challenge` transaction, which opens a new challenge on an item.
   * @param key 
   * @param newValue 
   * @param stake 
   */
  challengeTx(
      key: string,
      newValue: string,
      stake: TokenValue,
      ): Tx {
    stake = stake || TokenValue.from(0);

    this.trace.message(`Challenge ${key} @ ${this.address} with "${
        newValue}" for ${stake.value}`);

    const abiEncodedChallengeCall =
        this.instance.contract.challengeItem.getData(
            key, newValue, stake.raw, this.dirt.defaultAccount());
    return this.dirt.Token.instance.approveAndCall
        .request(this.address, stake, abiEncodedChallengeCall)
        .params[0];
  }

  /**
   * Sends a `challenge` transaction.
   * See `challengeTx`.
   */
  async challenge(
      key: string,
      newValue: string,
      stake: TokenValue,
      ): Promise<{voteId: number; contract: string;}> {
    stake = stake || TokenValue.from(0);

    this.trace.message(`Challenge ${key} @ ${this.address} with "${
        newValue}" for ${stake.value}`);

    const abiEncodedChallengeCall =
        this.instance.contract.challengeItem.getData(
            key, newValue, stake.raw, this.dirt.defaultAccount());
    await this.dirt.Token.approveAndCall(
        this.address, stake, abiEncodedChallengeCall);

    const [contract, id] = await this.instance.getActiveVote.call(key);

    return {voteId: id, contract};
  }

  // Note: hiding these for now since direct edit's broken.
  /** @internal */
  /** @hidden */
  editItemTx(key: string, value: string) {
    return this.instance.editItem.request(key, value);
  }

  /** @internal */
  /** @hidden */
  async editItem(key: string, value: string):
      Promise<ChallengeableRegistryItem> {
    await this.instance.editItem(key, value, {
      from: this.dirt.defaultAccount(),
      gas: 5000000
    });
    return this.item(key);
  }

  //@dev deprecated. Delete when we're feature parity with old UI
  /** @internal */
  /** @hidden */
  getVoteHistoryEnumerator(stakeHolderAddr: string):
      AsyncEnumerator<VoteInstanceDescriptor> {
    const voteHistory = new VoteHistory(this.instance, stakeHolderAddr);
    return new AsyncEnumerator<VoteInstanceDescriptor>(voteHistory);
  }

  //@dev deprecated Delete when we're feature parity with old UI
  /** @internal */
  /** @hidden */
  async getVoteHistoryCount(stakeHolderAddr: string): Promise<number> {
    const voteHistory = new VoteHistory(this.instance, stakeHolderAddr);
    return voteHistory.count();
  }

  /**
   * Returns the specified item's active vote.
   * @param key Registry key of item
   */
  async getItemVoteInstance<TVote extends Poll>(key: string):
      Promise<TVote> {
    const [contract, id] = await this.instance.getActiveVote.call(key);

    if (!contract || !id) {
      throw new Error('Item is not being challenged');
    }

    return (await VoteStyleFactory.createScoped(
               this.dirt.contractReader, this.voteStyle, contract, id)) as
        TVote;
  }

  async getVoteInstance<TVote extends Poll>(voteRef: VoteInstanceDescriptor):
      Promise<TVote> {
    return (await VoteStyleFactory.createScoped(
               this.dirt.contractReader, this.voteStyle, voteRef.address,
               voteRef.voteId)) as TVote;
  }
}
