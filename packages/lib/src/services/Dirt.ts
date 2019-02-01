import * as Web3 from 'web3';
import { ContractReader, IContractProvider } from './ContractReader';
import {
    Token,
    Registry,
    RegistryTypes,
    RegistryType,
    RootRegistry,
    Parameters,
    KnownClasses,
    KnownCoreParameters,
    KnownVoteParameters,
} from '../contracts';
import { VoteStyleFactory } from '../contracts/VoteStyleFactory';
import { BaseVoteController, ScopedVote } from '../contracts/BaseVote';
import { Tx } from 'web3/eth/types';

export interface IDirtConfiguration {
    rootAddress?: string;
    rootContractName?: string;
    trace?: boolean;
    web3: Web3;
    contractProvider?: IContractProvider;
}

export class DirtTrace {

    constructor(public enabled: boolean, private parent: Dirt, private scope: string) {
        this.enabled = enabled;
    }

    message(message: string): DirtTrace {
        if (!this.enabled) {
            return this;
        }

        console.log(this.prefix() + (message == null ? '<null>' : message));
        return this;
    }

    object(object: any): DirtTrace {
        if (!this.enabled) {
            return this;
        }

        if (typeof object == 'string') {
            this.message(object);
        }

        console.log(this.prefix());
        console.dir(object == null ? '<null>' : object);
        return this;
    }

    error(error: any): DirtTrace {
        if (!this.enabled) {
            return this;
        }

        console.error(this.prefix());
        console.error(error == null ? '<null error>' : error);
        return this;
    }

    async promise(promise: () => Promise<any>): Promise<DirtTrace> {
        if (!this.enabled) {
            return this;
        }

        let res = null;
        try {
            res = await promise();
        }
        catch (e) {
            this.error(e);
            return this;
        }

        this.object(res);
        return this;
    }

    function(func: Function): DirtTrace {
        if (!this.enabled) {
            return this;
        }

        let res = func();
        this.object(res);

        return this;
    }

    private prefix(): string {
        const date = new Date();
        const dateString = date.toLocaleTimeString();
        return `[${dateString}] ${this.scope} [From=${this.parent.defaultAccount()}] `
    }

    public create(scope: string): DirtTrace {
        return new DirtTrace(this.enabled, this.parent, scope);
    }
}

export class Dirt {

    public Parameters: Parameters;
    public Token: Token;
    public Root: RootRegistry;

    public web3: Web3;
    public trace: DirtTrace;

    public contractCache: ContractReader;

    private voteCtrlAddrs: string[];

    constructor(private configuration: IDirtConfiguration) {
        this.contractCache = new ContractReader(this, configuration.web3, configuration.contractProvider);
        this.web3 = configuration.web3;
        this.trace = new DirtTrace(configuration.trace || false, this, `DIRT`);

        this.voteCtrlAddrs = [];
    }

    async getRegistryAtAddress<T extends Registry<any>>(address: string, type: RegistryType): Promise<T> {
        return this.contractCache.getContract<T>({
            address: address,
            name: type,
            type: RegistryTypes[type]
        });
    }

    async getVoteAtAddress<T extends BaseVoteController = BaseVoteController>(address: string): Promise<T> {
        this.trace.message(`Creating BaseVoteController for '${address}'`);
        let instance = await VoteStyleFactory.createController(this.contractCache, address);
        this.trace.message(`Got vote controller instance for '${address}' with style ${instance.style}`)
        return instance as T;
    }

    /*@dev this may not belong here at the top level. Move somewhere else
     * if appropriate
     */
    voteIdHistory(userAddress: string): Promise<number[]> {
        return new Promise<number[]>(async (resolve, reject) => {

            let voteCastSig = this.web3.sha3("VoteCast(uint256,address,uint256)")
            let userAddr = "0x000000000000000000000000" + userAddress.slice(2)

            let filter = this.web3.eth.filter({
                fromBlock: 0,
                toBlock: 'latest',
                address: this.voteCtrlAddrs[0],
                topics: [voteCastSig, null, userAddr],
            })

            filter.get((err, logEntries) => {
                if (err) { reject(err); return }

                let voteIds = logEntries.map((logEntry) => {
                    return this.web3.toDecimal(logEntry.topics[1])
                })

                resolve(voteIds)
            })

        })
    }

    /* @dev this may not belong here at the top level. Move somewhere else
     *   if appropriate
     * @dev might need to add a limit and offset in the future
     * @dev FIXME for now, it just assumes they're all public votes.
     *   will need to find a way to return the types of votes, so
     *   we know how to instanciate it.
     * @dev might have to implement an enumerator instead
     */
    voteHistory(userAddress: string): Promise<ScopedVote[]> {

        return this.voteIdHistory(userAddress)
            .then((voteIds) => {

                return Promise.all(
                    voteIds.map(async (voteId) => {

                        // assumes a public vote
                        let scopedVote = await VoteStyleFactory.createScoped(
                            this.contractCache,
                            "PUBLIC",
                            this.voteCtrlAddrs[0],
                            voteId
                        )

                        return scopedVote
                    })
                )

            })
    }

    defaultAccount() {
        // Do not track account outside of web3. We want to keep things consistent.
        let account = this.web3.eth.defaultAccount || this.web3.eth.accounts[0];
        return account;
    }

    private async load() {
        // Load the root repository, from this we can discover the rest of the
        // static contracts we need

        this.Root = await this.contractCache.getContract<RootRegistry>({
            address: this.configuration.rootAddress,
            type: RootRegistry,
            name: this.configuration.rootContractName || "RootRegistry"
        });

        // Load parameters contract to discover everything else
        this.Parameters = await this.contractCache.getContract<Parameters>({
            address: this.Root.addresses.parameters,
            type: Parameters,
            name: "Parameters"
        });

        // Load the token singleton
        this.Token = await this.contractCache.getContract<Token>({
            address: await this.Parameters.getAddress(KnownClasses.CORE, KnownCoreParameters.TOKEN),
            type: Token,
            name: "ProtocolToken"
        });


        this.voteCtrlAddrs = await Promise.all([
            this.Parameters.getAddress(KnownClasses.VOTE, KnownVoteParameters.PUBLIC),
            this.Parameters.getAddress(KnownClasses.VOTE, KnownVoteParameters.COMMIT_REVEAL),
            this.Parameters.getAddress(KnownClasses.VOTE, KnownVoteParameters.LOCKED_COMMIT_REVEAL),
        ])
    }

    static async create(configuration: IDirtConfiguration): Promise<Dirt> {
        // Yuck;
        let dirt = new Dirt(configuration);
        await dirt.load()
        return dirt;
    }

    async sendTransaction(tx: Tx) : Promise<any> {
        return new Promise((resolve, reject) => {
            this.web3.eth.sendTransaction(<Web3.TxData>tx, (err, result) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(result)
            })
        })
    }
}
