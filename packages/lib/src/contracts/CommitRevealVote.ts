import * as abi from 'ethereumjs-abi';

import {BaseVoteController, Candidate, TypedPoll} from './BaseVote';
import {TokenSpenderApprovalScope, TokenValue} from './Token';

export class BaseCommitRevealVoteController extends BaseVoteController {
  async reveal(voteId: number, candidate: Candidate, salt: number):
      Promise<void> {
    await this.instance.revealVote(
        voteId, candidate, salt,
        {from: this.dirt.defaultAccount(), gas: 1000000});
  }

  /**
   * Increases the vote stake by the additional specified amount.
   * @param voteId 
   * @param stake amount 
   * @param approveTransfer 
   */
  async increaseCommit(
      voteId: number, stake: TokenValue,
      approveTransfer = true): Promise<void> {
    let scope: TokenSpenderApprovalScope = TokenSpenderApprovalScope.EMPTY;

    if (approveTransfer) {
      scope = await this.dirt.Token.ensureSpenderApproval(this.address, stake);
    }

    try {
      await this.instance.increaseCommit(
          voteId, stake.raw, {from: this.dirt.defaultAccount(), gas: 1000000});
    } catch (e) {
      await scope.revert();
      throw e;
    }
  }

  /** @internal */
  /** @hidden */
  protected generateSecretHash(candidate: Candidate, salt: number): string {
    const hash = `0x${
        abi.soliditySHA3(['uint', 'uint'], [candidate, salt]).toString('hex')}`;
    return hash;
  }

  /**
   * @param voteId 
   * @returns whether the vote reveal stage is active.
   */
  async revealActive(voteId: number): Promise<boolean> {
    return await this.instance.revealActive(voteId);
  }

  /**
   * @param voteId 
   * @returns whether the user has committed a vote.
   */
  async hasCommitted(voteId: number): Promise<boolean> {
    return await this.instance.hasCommitted(
        voteId, {from: this.dirt.defaultAccount()});
  }
}

/**
 * Convenience class for `LockedCommitRevealVoteController.sol`.
 */
export class LockedCommitRevealVoteController extends BaseCommitRevealVoteController {
  async getScoped(voteId: number): Promise<ScopedLockedCommitRevealVote> {
    const instance = new ScopedLockedCommitRevealVote(this, voteId);
    instance.configuration = await this.getVoteConfiguration(voteId);
    return instance;
  }

  /**
   * Commits a hidden vote with a stake.
   * @param voteId 
   * @param candidate 
   * @param salt 
   * @param stake 
   * @param commitStake 
   * @param approveTransfer 
   */
  async commit(
      voteId: number, candidate: Candidate, salt: number, stake: TokenValue,
      commitStake: TokenValue, approveTransfer = true): Promise<void> {
    // this.context.web3.utils.soliditySha3({ t: 'uint', v: candidate }, { t:
    // 'uint', v: salt });
    const hash = this.generateSecretHash(candidate, salt);

    let scope: TokenSpenderApprovalScope = TokenSpenderApprovalScope.EMPTY;
    const commitAndStake = stake.add(commitStake);

    if (approveTransfer) {
      scope = await this.dirt.Token.ensureSpenderApproval(
          this.address, commitAndStake);
    }

    this.trace.message(`Vote commit andidate '${candidate}' on vote '${
        voteId}' with stake of ${stake}/${commitStake}. Hash: ${hash}`);

    try {
      await this.instance.commit(
          voteId, hash, stake.raw, commitStake.raw,
          {from: this.dirt.defaultAccount(), gas: 1000000});
    } catch (e) {
      await scope.revert();
      throw e;
    }
  }
}

export class ScopedLockedCommitRevealVote extends
    TypedPoll<LockedCommitRevealVoteController> {
  commit(
      candidate: Candidate, salt: number, stake: TokenValue,
      commitStake: TokenValue, approveTransfer = true): Promise<void> {
    return this.source.commit(
        this.voteId, candidate, salt, stake, commitStake, approveTransfer);
  }

  reveal(candidate: Candidate, salt: number): Promise<void> {
    return this.source.reveal(this.voteId, candidate, salt);
  }

  revealActive(): Promise<boolean> {
    return this.source.revealActive(this.voteId);
  }

  hasCommitted(): Promise<boolean> {
    return this.source.hasCommitted(this.voteId);
  }
}

export class CommitRevealVoteController extends BaseCommitRevealVoteController {
  async getScoped(voteId: number): Promise<ScopedCommitRevealVote> {
    const instance = new ScopedCommitRevealVote(this, voteId);
    instance.configuration = await this.getVoteConfiguration(voteId);
    return instance;
  }

  async commit(
      voteId: number, candidate: Candidate, salt: number, stake: TokenValue,
      approveTransfer = true): Promise<void> {
    const hash = this.generateSecretHash(candidate, salt);

    let scope: TokenSpenderApprovalScope = TokenSpenderApprovalScope.EMPTY;

    if (approveTransfer) {
      scope = await this.dirt.Token.ensureSpenderApproval(this.address, stake);
    }

    this.trace.message(`Vote commit andidate '${candidate}' on vote '${
        voteId}' with stake of ${stake}. Hash: ${hash}`);


    try {
      await this.instance.commit(
          voteId, hash, stake.raw,
          {from: this.dirt.defaultAccount(), gas: 1000000});
    } catch (e) {
      await scope.revert();
      throw e;
    }
  }
}

export class ScopedCommitRevealVote extends TypedPoll<CommitRevealVoteController> {
  commit(
      candidate: Candidate, salt: number, stake: TokenValue,
      approveTransfer = true): Promise<void> {
    return this.source.commit(this.voteId, candidate, salt, stake, approveTransfer);
  }

  increaseCommit(stake: TokenValue): Promise<void> {
    return this.source.increaseCommit(this.voteId, stake);
  }

  reveal(candidate: Candidate, salt: number): Promise<void> {
    return this.source.reveal(this.voteId, candidate, salt);
  }

  revealActive(): Promise<boolean> {
    return this.source.revealActive(this.voteId);
  }

  hasCommitted(): Promise<boolean> {
    return this.source.hasCommitted(this.voteId);
  }
}
