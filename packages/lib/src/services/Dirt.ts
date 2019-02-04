import * as Web3 from 'web3';
import {Tx} from 'web3/eth/types';

import {KnownClasses, KnownCoreParameters, KnownVoteParameters, Parameters, Registry, RootRegistry, Token, VoteStyle,} from '../contracts';
import {BaseVoteController, Poll} from '../contracts/BaseVote';
import {VoteStyleFactory} from '../contracts/VoteStyleFactory';

import {ContractReader} from './ContractReader';
import {DirtTrace} from './DirtTrace';


/**
 * Configuration used to instantiate `Dirt` client.
 */
export interface IDirtConfiguration {
  rootAddress: string;
  web3: Web3;
  trace?: boolean;
}

/**
 * Client for interacting with DIRT Protocol.
 * Instantiate with `Dirt.create()`.
 */
export class Dirt {
  private parameters: Parameters;
  private token: Token;
  private root: RootRegistry;
  
  /** @internal */
  /** @hidden */
  web3: Web3;
  /** @internal */
  /** @hidden */
  trace: DirtTrace;

  /** @internal */
  /** @hidden */
  contractReader: ContractReader;

  private voteCtrlAddrs: string[];

  /**
   * @param configuration Parameters for connecting to DIRT contract on
   * blockchain.
   * @returns a new instance of `Dirt`
   */
  static async create(configuration: IDirtConfiguration): Promise<Dirt> {
    const dirt = new Dirt(configuration);
    await dirt.load();
    return dirt;
  }

  private constructor(private configuration: IDirtConfiguration) {
    this.contractReader = new ContractReader(this, configuration.web3);
    this.web3 = configuration.web3;
    this.trace = new DirtTrace(configuration.trace || false, this, `DIRT`);

    this.voteCtrlAddrs = [];
  }

  /**
   * @param address Contract address of registry.
   * @param type Convenience class type for the contract. Should be the same as the
   * parameter type `T`.
   */
  async getRegistryAtAddress<T extends Registry<any>>(
      address: string, type: new(...args) => T): Promise<T> {
    return this.contractReader.getContract<T>({address, type});
  }

  /**
   * @param address Contract address of vote.
   */
  async getVoteControllerAtAddress<T extends BaseVoteController = BaseVoteController>(
      address: string): Promise<T> {
    this.trace.message(`Creating BaseVoteController for '${address}'`);
    const instance =
        await VoteStyleFactory.createController(this.contractReader, address);
    this.trace.message(`Got vote controller instance for '${
        address}' with style ${instance.style}`);
    return instance as T;
  }

  /*@dev this may not belong here at the top level. Move somewhere else
   * if appropriate
   */

  /**
   * @param userAddress
   * @returns A list of IDs of all votes that the specified user has
   * participated in.
   */
  /** @internal */
  async voteIdHistory(userAddress: string): Promise<number[]> {
    const voteCastSig = this.web3.sha3('VoteCast(uint256,address,uint256)');
    const userAddr = '0x000000000000000000000000' + userAddress.slice(2);

    const filter = this.web3.eth.filter({
      fromBlock: 0,
      toBlock: 'latest',
      address: this.voteCtrlAddrs[0],
      topics: [voteCastSig, null, userAddr],
    });

    return new Promise<number[]>(async (resolve, reject) => {
      filter.get((err, logEntries) => {
        if (err) {
          reject(err);
          return;
        }

        const voteIds = logEntries.map((logEntry) => {
          return this.web3.toDecimal(logEntry.topics[1]);
        });

        resolve(voteIds);
      });
    });
  }

  /* @dev this may not belong here at the top level. Move somewhere else
   *   if appropriate
   * @dev might need to add a limit and offset in the future
   * @dev FIXME for now, it just assumes they're all public votes.
   *   will need to find a way to return the types of votes, so
   *   we know how to instanciate it.
   * @dev might have to implement an enumerator instead
   */
  /** @internal */
  /** @hidden */
  async voteHistory(userAddress: string): Promise<Poll[]> {
    return this.voteIdHistory(userAddress).then((voteIds) => {
      return Promise.all(voteIds.map(async (voteId) => {
        // assumes a public vote
        const scopedVote = await VoteStyleFactory.createScoped(
            this.contractReader, VoteStyle.Public, this.voteCtrlAddrs[0],
            voteId);

        return scopedVote;
      }));
    });
  }

  /** @internal */
  /** @hidden */
  defaultAccount() {
    // Do not track account outside of web3. We want to keep things consistent.
    const account = this.web3.eth.defaultAccount || this.web3.eth.accounts[0];
    return account;
  }

  /** @internal */
  /** @hidden */
  async sendTransaction(tx: Tx): Promise<any> {
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

  private async load() {
    // Load the root repository, from this we can discover the rest of the
    // static contracts we need.
    this.root = await this.contractReader.getContract<RootRegistry>({
      address: this.configuration.rootAddress,
      type: RootRegistry,
    });

    // Load parameters contract to discover everything else
    this.parameters = await this.contractReader.getContract<Parameters>(
        {address: this.Root.addresses.parameters, type: Parameters});

    // Load the token singleton
    this.token = await this.contractReader.getContract<Token>({
      address: await this.Parameters.getAddress(
          KnownClasses.CORE, KnownCoreParameters.TOKEN),
      type: Token
    });

    this.voteCtrlAddrs = await Promise.all([
      this.Parameters.getAddress(KnownClasses.VOTE, KnownVoteParameters.PUBLIC),
      this.Parameters.getAddress(
          KnownClasses.VOTE, KnownVoteParameters.COMMIT_REVEAL),
      this.Parameters.getAddress(
          KnownClasses.VOTE, KnownVoteParameters.LOCKED_COMMIT_REVEAL),
    ]);
  }

  /**
   * RootRegistry contract.
   */
  get Root() {
    return this.root;
  }

  /**
   * Parameters contract.
   */
  get Parameters() {
    return this.parameters;
  }

  /**
   * ProtocolToken contract.
   */
  get Token() {
    return this.token;
  }
}
