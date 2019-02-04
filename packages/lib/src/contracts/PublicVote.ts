import {BaseVoteController, Candidate, TypedPoll} from './BaseVote';
import {TokenSpenderApprovalScope, TokenValue} from './Token';

export class PublicVoteController extends BaseVoteController {
  async vote(voteId: number, candidate: Candidate, stake: TokenValue):
      Promise<void> {
    this.trace.message(`Vote candidate '${candidate}' on vote '${
        voteId}' with stake of ${stake}`);

    const abiEncodedVoteCall = this.instance.contract.vote.getData(
        voteId, candidate, stake.raw, this.dirt.defaultAccount());
    await this.dirt.Token.approveAndCall(
        this.address, stake, abiEncodedVoteCall);
  }

  async increaseVote(
      voteId: number, additionalStake: TokenValue, approveTransfer = true,
      approvalSuccessCallback: () => void, approvalFailureCallback: () => void,
      increaseVoteSuccessCallback: () => void,
      increaseVoteFailureCallback: () => void): Promise<void> {
    let scope: TokenSpenderApprovalScope = TokenSpenderApprovalScope.EMPTY;

    if (approveTransfer) {
      try {
        scope = await this.dirt.Token.ensureSpenderApproval(
            this.address, additionalStake);
        if (approvalSuccessCallback) approvalSuccessCallback();
      } catch {
        if (approvalFailureCallback) approvalFailureCallback();
      }
    }

    this.trace.message(`Increase existing vote for vote ${voteId} by stake of ${
        additionalStake}`);

    try {
      await this.instance.increaseVote(
          voteId, additionalStake.raw, {from: this.dirt.defaultAccount()});
      if (increaseVoteSuccessCallback) increaseVoteSuccessCallback();
    } catch (e) {
      await scope.revert();
      if (increaseVoteFailureCallback) increaseVoteFailureCallback();
      throw e;
    }
  }

  async getCandidate(voteId: number): Promise<Candidate> {
    return this.instance.getCandidate(voteId);
  }

  async getScoped(voteId: number): Promise<ScopedPublicVote> {
    const instance = new ScopedPublicVote(this, voteId);
    this.dirt.trace.message(`Creating scoped for ${this.address}/${voteId}`);
    instance.configuration = await this.getVoteConfiguration(voteId);
    return instance;
  }
}

export class ScopedPublicVote extends TypedPoll<PublicVoteController> {
  vote(
      candidate: Candidate,
      stake: TokenValue,
      ): Promise<void> {
    return this.source.vote(this.voteId, candidate, stake);
  }

  increaseVote(
      additionalStake: TokenValue, autoApprove = true,
      approvalSuccessCallback: () => void, approvalFailureCallback: () => void,
      increaseVoteSuccessCallback: () => void,
      increaseVoteFailureCallback: () => void): Promise<void> {
    return this.source.increaseVote(
        this.voteId, additionalStake, autoApprove, approvalSuccessCallback,
        approvalFailureCallback, increaseVoteSuccessCallback,
        increaseVoteFailureCallback);
  }

  revealActive(): Promise<boolean> {
    return Promise.resolve(false);
  }

  hasCommitted(): Promise<boolean> {
    return Promise.resolve(false);
  }
}
