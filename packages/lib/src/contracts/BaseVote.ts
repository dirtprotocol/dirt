import { Contract } from './Contract';
import { TokenValue } from './Token';

export enum Candidate {
    None = 0,
    Incumbent = 1,
    Challenger = 2
}

export interface ICandidate {
    owner: string;
    value: string;
    totalVoteValue: TokenValue;
}

export interface IVoteStatus {
    expirationTimestamp: number;
    incumbent: ICandidate;
    challenger: ICandidate;
}


export interface IVoteConfiguration {
    challengePenalty: number;
    votePenalty: number;
    challengeLength: number;
    challengeDistribution: number;
    minVoteStake: TokenValue;
    minVoteIncrementalStake: TokenValue;
}

export abstract class ScopedVote {
    public address: string;
    public style: string;

    public configuration: IVoteConfiguration;

    constructor(protected source: BaseVoteController, public id: number) {
        this.address = source.address;
        this.style = source.style;
    }

    depositBalanceOf(address?: string): Promise<TokenValue> {
        return this.source.depositBalanceOf(address);
    }

    potAmount(): Promise<TokenValue> {
        return this.source.potAmount(this.id);
    }

    exists(): Promise<boolean> {
        return this.source.pollExists(this.id);
    }

    active(): Promise<boolean> {
        return this.source.pollActive(this.id);
    }

    resolved(): Promise<boolean> {
        return this.source.pollResolved(this.id);
    }

    payoutTimeEnded(): Promise<boolean> {
        return this.source.pollPayoutTimeEnded(this.id);
    }

    hasVoted(): Promise<boolean> {
        return this.source.hasVoted(this.id);
    }

    getStatus(): Promise<IVoteStatus> {
        return this.source.getStatus(this.id);
    }

    getConfig(): Promise<IVoteConfiguration> {
        return this.source.getVoteConfiguration(this.id);
    }

    getPayoutAmount(): Promise<TokenValue> {
        return this.source.getPayoutAmount(this.id);
    }

    resolve(): Promise<boolean> {
        return this.source.resolve(this.id);
    }

    claimPayout(): Promise<void> {
        return this.source.claimPayout(this.id);
    }

    close(): Promise<boolean> {
        return this.source.close(this.id);
    }

    forceExpireActiveState(): Promise<boolean> {
        return this.source.forceExpireActiveState(this.id);
    }

    forceExpireRevealState(): Promise<boolean> {
        return this.source.forceExpireRevealState(this.id);
    }

    forceExpirePayoutState(): Promise<boolean> {
        return this.source.forceExpirePayoutState(this.id);
    }
}

export abstract class TypedScopedVote<TController extends BaseVoteController = BaseVoteController> extends ScopedVote {
    public address: string;
    public configuration: IVoteConfiguration;

    constructor(protected source: TController, public id: number) {
        super(source, id);
        this.address = source.address;
    }
}

export abstract class BaseVoteController extends Contract {

    public style : string = null;

    async init() : Promise<void> {
        await super.init();
        this.style = await this.instance.getStyleName.call();
    }

    async pollExists(voteId: number): Promise<boolean> {
        return await this.instance.pollExists.call(voteId)
    }

    async pollActive(voteId: number): Promise<boolean> {
        return await this.instance.pollActive.call(voteId)
    }

    async pollResolved(voteId: number): Promise<boolean> {
        return await this.instance.pollResolved.call(voteId)
    }

    async pollPayoutTimeEnded(voteId: number): Promise<boolean> {
        return await this.instance.pollPayoutTimeEnded.call(voteId)
    }

    async hasVoted(voteId: number): Promise<boolean> {
        return await this.instance.hasVoted.call(voteId, {
            from: this.dirt.defaultAccount()
        })
    }

    async getVoteConfiguration(voteId: number): Promise<IVoteConfiguration> {
        let res = await this.instance.getConfig.call(voteId);

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
    async depositBalanceOf(address?: string): Promise<TokenValue> {
        address = address || this.dirt.defaultAccount();
        let raw = await this.instance.depositBalanceOf.call(address);
        return TokenValue.fromRaw(raw);
    }

    async potAmount(voteId: number): Promise<TokenValue> {
        console.log("BaseVote.potAmount:", voteId)
        let raw = await this.instance.potAmount.call(voteId)
        return TokenValue.fromRaw(raw)
    }

    async getStatus(voteId: number): Promise<IVoteStatus> {

        if(!voteId) {
            throw new Error(`Vote ID argument must be specified`);
        }

        let [expires, iOwner, cOwner, iValue, cValue, iTotal, cTotal] = await this.instance.getStatus.call(voteId);

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
        }
    }

    async getPayoutAmount(voteId: number): Promise<TokenValue> {
        return await this.instance.getPayoutAmount.call(voteId, {
            from: this.dirt.defaultAccount()
        })
    }

    async resolve(voteId: number): Promise<boolean> {
        try {
            // FIX need to explicitly stipulate gas amount.
            let tx = await this.instance.resolve(voteId, {
                from: this.dirt.defaultAccount(),
                gas: 1000000
            });
            console.dir(tx)
        } catch(err) {
            console.warn(err)
            return Promise.resolve(false);
        }
        return Promise.resolve(true);
    }

    async claimPayout(voteId: number): Promise<void> {
        //@dev originally used dispatchTransaction
        // return this.dispatchTransaction('claimPayout', voteId, { from: this.context.defaultAccount() });
        try {
            await this.instance.claimPayout(voteId, {
                from: this.dirt.defaultAccount(),
                gas: 1000000
            })
        } catch(err) {
            console.warn(err)
            return Promise.reject(err)
        }
        return Promise.resolve()
    }

    async close(voteId: number): Promise<boolean> {
        try {
            await this.instance.close(voteId, {
                from: this.dirt.defaultAccount()
            })
        } catch(err) {
            console.warn(err)
            return Promise.resolve(false)
        }
        return Promise.resolve(true)
    }

    async forceExpireActiveState(voteId: number): Promise<boolean> {
        try {
            await this.instance.forceExpireActiveState(voteId, {
                from: this.dirt.defaultAccount()
            })
        } catch(err) {
            console.warn(err)
            // TODO copied from above. Shouldn't this reject instead of resolve?
            return Promise.resolve(false)
        }
        return Promise.resolve(true)
    }

    async forceExpireRevealState(voteId: number): Promise<boolean> {
        try {
            await this.instance.forceExpireRevealState(voteId, {
                from: this.dirt.defaultAccount(),
                gas: 1000000
            })
        } catch(err) {
            console.error(err)
            return Promise.resolve(false)
        }

        return Promise.resolve(true)
    }

    async forceExpirePayoutState(voteId: number): Promise<boolean> {
        try {
            await this.instance.forceExpirePayoutState(voteId, { from: this.dirt.defaultAccount() })
        } catch(err) {
            console.warn(err)
            return Promise.resolve(false)
        }
        return Promise.resolve(true)
    }

}