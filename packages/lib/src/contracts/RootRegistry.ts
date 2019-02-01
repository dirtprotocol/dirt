import { Registry } from './Registry';
import { IAsyncEnumerableSource } from '../util/AsyncEnumerator';
import { TokenValue } from './Token';
import { TxData, Transaction, CallTxDataBase } from 'web3';
import { Tx } from 'web3/eth/types';

export class RegistryDescriptor {
    constructor(public name: string, public address: string, public vote_style: string, public timestamp: number) {
    }
}

export interface IKnownAddresses {
    parameters: string;
    self: string;
}

export enum VoteStyle {
    Unknown = "",
    Public = "PUBLIC",
    CommitReveal = "COMMIT_REVEAL",
    LockedCommitReveal = "LOCKED_COMMIT_REVEAL"

}

export class RootRegistry extends Registry<RegistryDescriptor> implements IAsyncEnumerableSource<RegistryDescriptor> {

    public addresses: IKnownAddresses = null;

    async init(): Promise<void> {
        await super.init();

        this.addresses = {
            self: this.address,
            parameters: await this.dispatchCall('parametersAddress'),
        };
    }

    async item(name: string): Promise<RegistryDescriptor> {
        let raw = await this.instance.getItem(name);
        return this.unpack([name, ...raw]);
    }

    async itemAtIndex(index: number): Promise<RegistryDescriptor> {
        let raw = await this.instance.getAtIndex(index);
        return this.unpack(raw);
    }

    createTx(
        name: string,
        style: VoteStyle | string,
        minWriteStake: number,
        minVoteStake: number
    ): Tx {
        if (!name || name.length == 0) {
            throw new Error("Name must be defined");
        }
        else if (!style || style.length == 0) {
            throw new Error("Vote style must be defined");
        }

        // TODO: This sucks, needs to be tuned
        this.trace.message(`Creating registry ${name} with vote style ${style} with writeStake ${minWriteStake} with minVoteStake ${minVoteStake}`);

        let minWriteStakeRaw = TokenValue.from(minWriteStake).raw;
        let minVoteStakeRaw = TokenValue.from(minVoteStake).raw;

        let request = this.instance.create.request(
            name,
            style,
            minWriteStakeRaw,
            minVoteStakeRaw
        )
        return request.params[0]
    }

    // TODO minStake amounts probably aren't optional
    async create(
        name: string,
        style: VoteStyle | string,
        minWriteStake: number,
        minVoteStake: number,
        createSuccessCallback?: () => void,
        createFailureCallback?: () => void
    ): Promise<RegistryDescriptor> {
        try {
            let tx = this.createTx(name, style, minWriteStake, minVoteStake)
            await this.dirt.sendTransaction(<TxData> tx)

            if (createSuccessCallback)
                createSuccessCallback();

        } catch(err) {
            if (createFailureCallback)
                createFailureCallback();

            throw(err);
        }

        return await this.item(name);
    }

    private unpack(values: any[]) {
        return new RegistryDescriptor(values[0], values[1], values[2], values[3]);
    }
}
