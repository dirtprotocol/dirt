import {
  AsyncEnumerator,
  IAsyncEnumerableSource
} from '../util/AsyncEnumerator';
import { StakableRegistryItem, BaseStakableRegistry } from './StakableRegistry';
import { TokenValue, TokenSpenderApprovalScope } from './Token';
import { ScopedVote, IVoteConfiguration } from './BaseVote';
import { VoteStyleFactory } from './VoteStyleFactory';
import { TxData } from 'web3';

export class ChallengeableRegistryItem extends StakableRegistryItem {
  public voteId?: number;
  public voteContract?: string;
}

export class VoteReference {
  constructor(
    public address: string,
    public voteId: number,
    public pendingCreastion: boolean
  ) {}
}

export class VoteHistory implements IAsyncEnumerableSource<VoteReference> {
  constructor(private instance: any, public stakeHolderAddr: string) {}

  async count(): Promise<number> {
    // deprecated
    // let raw = await this.instance.getVoteHistoryCount.call(this.stakeHolderAddr);
    return 0;
  }

  async itemAtIndex(index: number): Promise<VoteReference> {
    let raw = await this.instance.getVoteHistory.call(
      this.stakeHolderAddr,
      index
    );
    return this.unpack(raw);
  }

  unpack(value: any[]): VoteReference {
    return new VoteReference(value[0], value[1], value[2]);
  }
}

export class ChallengeableRegistry extends BaseStakableRegistry<
  ChallengeableRegistryItem
> {
  public voteStyle: string = '';
  public voteConfiguration: IVoteConfiguration;

  async init(): Promise<void> {
    await super.init();

    this.voteStyle = await this.instance.voteStyle.call();
    this.voteConfiguration = await this.getVoteConfiguration();
  }

  private async getVoteConfiguration(): Promise<IVoteConfiguration> {
    let res = await this.instance.voteConfiguration.call();
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
    let unpacked = new ChallengeableRegistryItem(
      this.address,
      value[0],
      value[1],
      value[2],
      value[3].toNumber(),
      TokenValue.fromRaw(value[4])
    );

    let [addr, id] = await this.instance.getActiveVote.call(unpacked.key);
    unpacked.voteContract = addr
    unpacked.voteId = id

    return unpacked;
  }

  public async challenge(
    key: string,
    newValue: string,
    stake: TokenValue,
    approve_transfer: boolean = true,
    approvalSuccessCallback: () => void,
    approvalFailureCallback: () => void,
    challengeSuccessCallback: () => void,
    challengeFailureCallback: () => void
  ): Promise<{
    voteId: number;
    contract: string;
  }> {
    stake = stake || TokenValue.from(0);
    let scope: TokenSpenderApprovalScope = TokenSpenderApprovalScope.Empty;

    this.trace.message(
      `Challenge ${key} @ ${this.address} with "${newValue}" for ${stake.value}`
    );

    try {
      const abiEncodedChallengeCall = this.instance.contract.challengeItem.getData(
        key, newValue, stake.raw, this.dirt.defaultAccount()
      );
      await this.dirt.Token.approveAndCall(
        this.address, stake, abiEncodedChallengeCall
      );
      if (challengeSuccessCallback) challengeSuccessCallback();
    } catch (e) {
      await scope.revert();
      if (challengeFailureCallback) challengeFailureCallback();
      throw e;
    }

    let [contract, id] = await this.instance.getActiveVote.call(key);

    return {
      voteId: id,
      contract: contract
    };
  }

  editItemTx(key: string, value: string) {
    return this.instance.editItem.request(key, value);
  }

  async editItem(key: string, value: string): Promise<ChallengeableRegistryItem> {
    let tx = this.editItemTx(key, value)
    await this.dirt.sendTransaction(<TxData> tx)
    return this.item(key);
  }

  //@dev deprecated. Delete when we're feature parity with old UI
  public getVoteHistoryEnumerator(
    stakeHolderAddr: string
  ): AsyncEnumerator<VoteReference> {
    let voteHistory = new VoteHistory(this.instance, stakeHolderAddr);
    return new AsyncEnumerator<VoteReference>(voteHistory);
  }

  //@dev deprecated Delete when we're feature parity with old UI
  public async getVoteHistoryCount(stakeHolderAddr: string): Promise<number> {
    let voteHistory = new VoteHistory(this.instance, stakeHolderAddr);
    return voteHistory.count();
  }

  public async getVoteInstance<TScoped extends ScopedVote>(
    key: string
  ): Promise<TScoped> {
    let [contract, id] = await this.instance.getActiveVote.call(key);

    if (!contract || !id) {
      throw new Error('Item is not being challenged');
    }

    return (await VoteStyleFactory.createScoped(
      this.dirt.contractCache,
      this.voteStyle,
      contract,
      id
    )) as TScoped;
  }

  public async getVoteRefInstance<TScoped extends ScopedVote>(
    voteRef: VoteReference
  ): Promise<TScoped> {
    return (await VoteStyleFactory.createScoped(
      this.dirt.contractCache,
      this.voteStyle,
      voteRef.address,
      voteRef.voteId
    )) as TScoped;
  }
}
