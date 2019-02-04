import {ContractReader} from '../services/ContractReader';

import {BaseVoteController, Poll} from './BaseVote';
import {CommitRevealVoteController, LockedCommitRevealVoteController} from './CommitRevealVote';
import {PublicVoteController} from './PublicVote';
import {VoteStyle} from './RootRegistry';


type ScopedFactoryHandler = (context: ContractReader, address: string) =>
    Promise<BaseVoteController>;

/** @internal */
/** @hidden */
export class VoteStyleFactoryImpl {
  private handlers: Map<string, ScopedFactoryHandler> = new Map();

  constructor() {
    this.handlers.set(VoteStyle.Public, async (context, address) => {
      const contract =
          await context.getContract<PublicVoteController>({type: PublicVoteController, address});

      return contract;
    });

    this.handlers.set(VoteStyle.CommitReveal, async (context, address) => {
      const contract = await context.getContract<CommitRevealVoteController>(
          {type: CommitRevealVoteController, address});

      return contract;
    });

    this.handlers.set(
        VoteStyle.LockedCommitReveal, async (context, address) => {
          const contract = await context.getContract<LockedCommitRevealVoteController>(
              {type: LockedCommitRevealVoteController, address});

          return contract;
        });
  }

  async createScoped(
      context: ContractReader, style: string, address: string,
      id: number): Promise<Poll> {
    const handler = this.handlers.get(style);
    if (!handler) {
      throw new Error('unknown vote style');
    }

    const instance: any = await handler(context, address);
    return instance.getScoped(id);
  }

  async createControllerWithStyle<T extends BaseVoteController>(
      context: ContractReader, style: string, address: string): Promise<T> {
    const handler = this.handlers.get(style);
    if (!handler) {
      throw new Error('unknown vote style');
    }

    const instance = await handler(context, address);
    return instance as T;
  }

  async createController(context: ContractReader, address: string) {
    const baseInstance: any =
        await context.getContractInstance('IVoteController', address);

    const style: string = await baseInstance.getStyleName.call();

    return await this.createControllerWithStyle(context, style, address);
  }
}

/* tslint:disable-next-line:variable-name */
export const VoteStyleFactory = new VoteStyleFactoryImpl();
