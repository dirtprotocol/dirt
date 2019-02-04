import {Contract} from './Contract';
import {TokenValue} from './Token';

/**
 * Candidate to vote for.
 */
export enum Candidate {
  None = 0,
  Incumbent = 1,
  Challenger = 2
}

export interface CandidateSummary {
  owner: string;
  value: string;
  totalVoteValue: TokenValue;
}

export interface VoteStatus {
  expirationTimestamp: number;
  incumbent: CandidateSummary;
  challenger: CandidateSummary;
}

export interface VoteConfiguration {
  challengePenalty: number;
  votePenalty: number;
  challengeLength: number;
  challengeDistribution: number;
  minVoteStake: TokenValue;
  minVoteIncrementalStake: TokenValue;
}

export abstract class Poll {
  address: string;
  style: string;

  configuration: VoteConfiguration;

  constructor(protected source: BaseVoteController, public voteId: number) {
    this.address = source.address;
    this.style = source.style;
  }

  depositBalanceOf(address?: string): Promise<TokenValue> {
    return this.source.depositBalanceOf(address);
  }

  potAmount(): Promise<TokenValue> {
    return this.source.potAmount(this.voteId);
  }

  exists(): Promise<boolean> {
    return this.source.pollExists(this.voteId);
  }

  active(): Promise<boolean> {
    return this.source.pollActive(this.voteId);
  }

  resolved(): Promise<boolean> {
    return this.source.pollResolved(this.voteId);
  }

  payoutTimeEnded(): Promise<boolean> {
    return this.source.pollPayoutTimeEnded(this.voteId);
  }

  hasVoted(): Promise<boolean> {
    return this.source.hasVoted(this.voteId);
  }

  getStatus(): Promise<VoteStatus> {
    return this.source.getStatus(this.voteId);
  }

  getConfig(): Promise<VoteConfiguration> {
    return this.source.getVoteConfiguration(this.voteId);
  }

  getPayoutAmount(): Promise<TokenValue> {
    return this.source.getPayoutAmount(this.voteId);
  }

  resolve(): Promise<boolean> {
    return this.source.resolve(this.voteId);
  }

  claimPayout(): Promise<void> {
    return this.source.claimPayout(this.voteId);
  }

  close(): Promise<boolean> {
    return this.source.close(this.voteId);
  }

  forceExpireActiveState(): Promise<boolean> {
    return this.source.forceExpireActiveState(this.voteId);
  }

  forceExpireRevealState(): Promise<boolean> {
    return this.source.forceExpireRevealState(this.voteId);
  }

  forceExpirePayoutState(): Promise<boolean> {
    return this.source.forceExpirePayoutState(this.voteId);
  }
}

export abstract class TypedPoll<
    TController extends BaseVoteController = BaseVoteController> extends
    Poll {
  address: string;
  configuration: VoteConfiguration;

  constructor(protected source: TController, public voteId: number) {
    super(source, voteId);
    this.address = source.address;
  }
}

export abstract class BaseVoteController extends Contract {
  style: string = null;

  /** @internal */
  /** @hidden */
  async init(): Promise<void> {
    await super.init();
    this.style = await this.instance.getStyleName.call();
  }

  async pollExists(voteId: number): Promise<boolean> {
    return await this.instance.pollExists.call(voteId);
  }

  async pollActive(voteId: number): Promise<boolean> {
    return await this.instance.pollActive.call(voteId);
  }

  async pollResolved(voteId: number): Promise<boolean> {
    return await this.instance.pollResolved.call(voteId);
  }

  async pollPayoutTimeEnded(voteId: number): Promise<boolean> {
    return await this.instance.pollPayoutTimeEnded.call(voteId);
  }

  async hasVoted(voteId: number): Promise<boolean> {
    return await this.instance.hasVoted.call(
        voteId, {from: this.dirt.defaultAccount()});
  }

  async getVoteConfiguration(voteId: number): Promise<VoteConfiguration> {
    const res = await this.instance.getConfig.call(voteId);

    return {
      challengePenalty: res[0].toNumber(),
      votePenalty: res[1].toNumber(),
      challengeLength: res[2].toNumber(),
      challengeDistribution: res[3].toNumber(),
      minVoteStake: TokenValue.fromRaw(res[4]),
      minVoteIncrementalStake: TokenValue.fromRaw(res[4])
    };
  }

  //@deprecated BaseVoteController uses TokenPot, which doesn't have deposits
  /** @internal */
  /** @hidden */
  async depositBalanceOf(address?: string): Promise<TokenValue> {
    address = address || this.dirt.defaultAccount();
    const raw = await this.instance.depositBalanceOf.call(address);
    return TokenValue.fromRaw(raw);
  }

  async potAmount(voteId: number): Promise<TokenValue> {
    console.log('BaseVote.potAmount:', voteId);
    const raw = await this.instance.potAmount.call(voteId);
    return TokenValue.fromRaw(raw);
  }

  async getStatus(voteId: number): Promise<VoteStatus> {
    if (!voteId) {
      throw new Error(`Vote ID argument must be specified`);
    }

    const [expires, iOwner, cOwner, iValue, cValue, iTotal, cTotal] =
        await this.instance.getStatus.call(voteId);

    return {
      expirationTimestamp: expires.toNumber(),
      incumbent: {
        owner: iOwner,
        value: iValue,
        totalVoteValue: TokenValue.fromRaw(iTotal),
      },
      challenger: {
        owner: cOwner,
        value: cValue,
        totalVoteValue: TokenValue.fromRaw(cTotal),
      }
    };
  }

  async getPayoutAmount(voteId: number): Promise<TokenValue> {
    return await this.instance.getPayoutAmount.call(
        voteId, {from: this.dirt.defaultAccount()});
  }

  async resolve(voteId: number): Promise<boolean> {
    try {
      // FIX need to explicitly stipulate gas amount.
      const tx = await this.instance.resolve(
          voteId, {from: this.dirt.defaultAccount(), gas: 1000000});
      console.dir(tx);
    } catch (err) {
      console.warn(err);
      return Promise.resolve(false);
    }
    return Promise.resolve(true);
  }

  async claimPayout(voteId: number): Promise<void> {
    try {
      await this.instance.claimPayout(
          voteId, {from: this.dirt.defaultAccount(), gas: 1000000});
    } catch (err) {
      console.warn(err);
      return Promise.reject(err);
    }
    return Promise.resolve();
  }

  async close(voteId: number): Promise<boolean> {
    try {
      await this.instance.close(voteId, {from: this.dirt.defaultAccount()});
    } catch (err) {
      console.warn(err);
      return false
    }
    return true
  }

  async forceExpireActiveState(voteId: number): Promise<boolean> {
    try {
      await this.instance.forceExpireActiveState(
          voteId, {from: this.dirt.defaultAccount()});
    } catch (err) {
      console.warn(err);
      // TODO copied from above. Shouldn't this reject instead of resolve?
      return false
    }
    return true
  }

  async forceExpireRevealState(voteId: number): Promise<boolean> {
    try {
      await this.instance.forceExpireRevealState(
          voteId, {from: this.dirt.defaultAccount(), gas: 1000000});
    } catch (err) {
      console.error(err);
      return false
    }

    return true
  }

  async forceExpirePayoutState(voteId: number): Promise<boolean> {
    try {
      await this.instance.forceExpirePayoutState(
          voteId, {from: this.dirt.defaultAccount()});
    } catch (err) {
      console.warn(err);
      return false
    }
    return true
  }
}
