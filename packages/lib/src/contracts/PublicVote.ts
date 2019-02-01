import { TokenValue, TokenSpenderApprovalScope } from './Token';
import {
  BaseVoteController,
  TypedScopedVote,
  Candidate
} from './BaseVote';

export class PublicVote extends BaseVoteController {
  async vote(
    voteId: number,
    candidate: Candidate,
    stake: TokenValue,
    approve_transfer: boolean = true,
    approvalSuccessCallback: () => void,
    approvalFailureCallback: () => void,
    voteSuccessCallback: () => void,
    voteFailureCallback: () => void
  ): Promise<void> {
    let scope: TokenSpenderApprovalScope = TokenSpenderApprovalScope.Empty;

    this.trace.message(
      `Vote candidate '${candidate}' on vote '${voteId}' with stake of ${stake}`
    );

    try {
      const abiEncodedVoteCall = this.instance.contract.vote.getData(
        voteId, candidate, stake.raw, this.dirt.defaultAccount()
      );
      await this.dirt.Token.approveAndCall(
        this.address, stake, abiEncodedVoteCall
      );
      if (voteSuccessCallback) voteSuccessCallback();
    } catch (e) {
      await scope.revert();
      if (voteFailureCallback) voteFailureCallback();
      throw e;
    }
  }

  async increaseVote(
    voteId: number,
    additionalStake: TokenValue,
    approve_transfer: boolean = true,
    approvalSuccessCallback: () => void,
    approvalFailureCallback: () => void,
    increaseVoteSuccessCallback: () => void,
    increaseVoteFailureCallback: () => void
  ): Promise<void> {
    let scope: TokenSpenderApprovalScope = TokenSpenderApprovalScope.Empty;

    if (approve_transfer) {
      try {
        scope = await this.dirt.Token.ensureSpenderApproval(
          this.address,
          additionalStake
        );
        if (approvalSuccessCallback) approvalSuccessCallback();
      } catch {
        if (approvalFailureCallback) approvalFailureCallback();
      }
    }

    this.trace.message(
      `Increase existing vote for vote ${voteId} by stake of ${additionalStake}`
    );

    try {
      await this.instance.increaseVote(voteId, additionalStake.raw, {
        from: this.dirt.defaultAccount()
      });
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
    let instance = new ScopedPublicVote(this, voteId);
    this.dirt.trace.message(`Creating scoped for ${this.address}/${voteId}`);
    instance.configuration = await this.getVoteConfiguration(voteId);
    return instance;
  }
}

export class ScopedPublicVote extends TypedScopedVote<PublicVote> {
  vote(
    candidate: Candidate,
    stake: TokenValue,
    auto_approve: boolean = true,
    approvalSuccessCallback: () => void,
    approvalFailureCallback: () => void,
    increaseVoteSuccessCallback: () => void,
    increaseVoteFailureCallback: () => void
  ): Promise<void> {
    return this.source.vote(
      this.id,
      candidate,
      stake,
      auto_approve,
      approvalSuccessCallback,
      approvalFailureCallback,
      increaseVoteSuccessCallback,
      increaseVoteFailureCallback
    );
  }

  increaseVote(
    additionalStake: TokenValue,
    auto_approve: boolean = true,
    approvalSuccessCallback: () => void,
    approvalFailureCallback: () => void,
    increaseVoteSuccessCallback: () => void,
    increaseVoteFailureCallback: () => void
  ): Promise<void> {
    return this.source.increaseVote(
      this.id,
      additionalStake,
      auto_approve,
      approvalSuccessCallback,
      approvalFailureCallback,
      increaseVoteSuccessCallback,
      increaseVoteFailureCallback
    );
  }

  revealActive(): Promise<boolean> {
    return Promise.resolve(false);
  }

  hasCommitted(): Promise<boolean> {
    return Promise.resolve(false);
  }
}
