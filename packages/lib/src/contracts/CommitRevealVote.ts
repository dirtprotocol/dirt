import { BaseVoteController, TypedScopedVote, Candidate } from './BaseVote';
import { TokenValue, TokenSpenderApprovalScope } from './Token';
import * as abi from 'ethereumjs-abi';

export class BaseCommitRevealVoteController extends BaseVoteController {

    async reveal(voteId: number, candidate: Candidate, salt: number): Promise<void> {
        await this.instance.revealVote(voteId, candidate, salt, {
            from: this.dirt.defaultAccount(),
            gas: 1000000
        });
    }

    async increaseCommit(voteId: number, stake: TokenValue, approve_transfer: boolean = true): Promise<void> {
        let scope: TokenSpenderApprovalScope = TokenSpenderApprovalScope.Empty;

        if (approve_transfer) {
            scope = await this.dirt.Token.ensureSpenderApproval(this.address, stake);
        }

        try {
            await this.instance.increaseCommit(voteId, stake.raw, {
                from: this.dirt.defaultAccount(),
                gas: 1000000
            })
        } catch (e) {
            await scope.revert();
            throw e;
        }
    }

    protected generateSecretHash(candidate: Candidate, salt: number): string {
        let hash = `0x${abi.soliditySHA3(['uint', 'uint'], [candidate, salt]).toString('hex')}`;
        return hash;
    }

    async revealActive(voteId: number): Promise<boolean> {
        return await this.instance.revealActive(voteId);
    }

    async hasCommitted(voteId: number): Promise<boolean> {
        return await this.instance.hasCommitted(voteId, {
            from: this.dirt.defaultAccount()
        });
    }
}

export class LockedCommitRevealVote extends BaseCommitRevealVoteController {
    async getScoped(voteId: number): Promise<ScopedLockedCommitRevealVote> {
        let instance = new ScopedLockedCommitRevealVote(this, voteId);
        instance.configuration = await this.getVoteConfiguration(voteId);
        return instance;
    }

    async commit(voteId: number, candidate: Candidate, salt: number, stake: TokenValue, commitStake: TokenValue, approve_transfer: boolean = true): Promise<void> {
        //this.context.web3.utils.soliditySha3({ t: 'uint', v: candidate }, { t: 'uint', v: salt });
        let hash = this.generateSecretHash(candidate, salt);

        let scope: TokenSpenderApprovalScope = TokenSpenderApprovalScope.Empty;
        let commitAndStake = stake.add(commitStake);

        if (approve_transfer) {
            scope = await this.dirt.Token.ensureSpenderApproval(this.address, commitAndStake);
        }

        this.trace.message(`Vote commit andidate '${candidate}' on vote '${voteId}' with stake of ${stake}/${commitStake}. Hash: ${hash}`);

        try {
            await this.instance.commit(voteId, hash, stake.raw, commitStake.raw, {
                from: this.dirt.defaultAccount(),
                gas: 1000000
            });
        }
        catch (e) {
            await scope.revert();
            throw e;
        }
    }
}

export class ScopedLockedCommitRevealVote extends TypedScopedVote<LockedCommitRevealVote> {

    commit(candidate: Candidate, salt: number, stake: TokenValue, commitStake: TokenValue, approve_transfer: boolean = true): Promise<void> {
        return this.source.commit(this.id, candidate, salt, stake, commitStake, approve_transfer);
    }

    reveal(candidate: Candidate, salt: number): Promise<void> {
        return this.source.reveal(this.id, candidate, salt);
    }

    revealActive(): Promise<boolean> {
        return this.source.revealActive(this.id)
    }

    hasCommitted(): Promise<boolean> {
        return this.source.hasCommitted(this.id)
    }
}

export class CommitRevealVote extends BaseCommitRevealVoteController {
    async getScoped(voteId: number): Promise<ScopedCommitRevealVote> {
        let instance = new ScopedCommitRevealVote(this, voteId);
        instance.configuration = await this.getVoteConfiguration(voteId);
        return instance;
    }

    async commit(voteId: number, candidate: Candidate, salt: number, stake: TokenValue, approve_transfer: boolean = true): Promise<void> {
        //this.context.web3.utils.soliditySha3({ t: 'uint', v: candidate }, { t: 'uint', v: salt });
        let hash = this.generateSecretHash(candidate, salt);

        let scope: TokenSpenderApprovalScope = TokenSpenderApprovalScope.Empty;

        if (approve_transfer) {
            scope = await this.dirt.Token.ensureSpenderApproval(this.address, stake);
        }

        this.trace.message(`Vote commit andidate '${candidate}' on vote '${voteId}' with stake of ${stake}. Hash: ${hash}`);


        try {
            await this.instance.commit(voteId, hash, stake.raw, {
                from: this.dirt.defaultAccount(),
                gas: 1000000
            });
        }
        catch (e) {
            await scope.revert();
            throw e;
        }
    }
}

export class ScopedCommitRevealVote extends TypedScopedVote<CommitRevealVote> {

    commit(candidate: Candidate, salt: number, stake: TokenValue, approve_transfer: boolean = true): Promise<void> {
        return this.source.commit(this.id, candidate, salt, stake, approve_transfer);
    }

    increaseCommit(stake: TokenValue): Promise<void> {
        return this.source.increaseCommit(this.id, stake);
    }

    reveal(candidate: Candidate, salt: number): Promise<void> {
        return this.source.reveal(this.id, candidate, salt);
    }

    revealActive(): Promise<boolean> {
        return this.source.revealActive(this.id)
    }

    hasCommitted(): Promise<boolean> {
        return this.source.hasCommitted(this.id)
    }

}