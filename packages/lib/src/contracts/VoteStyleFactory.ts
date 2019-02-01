import { ScopedVote, BaseVoteController } from "./BaseVote";
import { PublicVote } from '..';
import { CommitRevealVote, LockedCommitRevealVote } from './CommitRevealVote';
import { ContractReader } from '../services/ContractReader';


type ScopedFactoryHandler = (context : ContractReader, address : string) => Promise<BaseVoteController>;

export class VoteStyleFactoryImpl { 

    private handlers : Map<string, ScopedFactoryHandler> = new Map();
    
    constructor() { 
        this.handlers.set("PUBLIC", async(context, address) => { 
            let contract = await context.getContract<PublicVote>({
                type: PublicVote,
                address,
                name: "PublicVoteController"
            });

            return contract;
        });

        this.handlers.set("COMMIT_REVEAL", async(context, address) => { 
            let contract = await context.getContract<CommitRevealVote>({
                type: CommitRevealVote,
                address,
                name: "CommitRevealVoteController"
            });

            return contract;
        });

        this.handlers.set("LOCKED_COMMIT_REVEAL", async(context, address) => { 
            let contract = await context.getContract<LockedCommitRevealVote>({
                type: LockedCommitRevealVote,
                address,
                name: "LockedCommitRevealVoteController"
            });

            return contract;
        });
    }


    async createScoped(context : ContractReader, style : string, address : string, id : number) : Promise<ScopedVote> { 
        let handler = this.handlers.get(style);
        if(!handler) { 
            throw new Error("unknown vote style");
        }

        let instance : any = await handler(context, address);
        return instance.getScoped(id);
    }

    async createControllerWithStyle<T extends BaseVoteController>(context : ContractReader, style : string, address : string) : Promise<T> { 
        let handler = this.handlers.get(style);
        if(!handler) { 
            throw new Error("unknown vote style");
        }

        let instance = await handler(context, address);
        return instance as T;
    }

    async createController(context : ContractReader, address : string) { 
        let baseInstance : any = await context.getContractInstance("IVoteController", address);

        let style : string = await baseInstance.getStyleName.call()

        return await this.createControllerWithStyle(context, style, address);
    }

}

export const VoteStyleFactory = new VoteStyleFactoryImpl();
