import { Contract } from './Contract';

export enum KnownClasses {
    CORE = "CORE",
    REGISTRY = "REGISTRY",
    VOTE = "VOTE"
}

export enum KnownCoreParameters {
    TOKEN = "TOKEN",
    ROOT = "ROOT",
}

export enum KnownVoteParameters {
    PUBLIC = "PUBLIC",
    COMMIT_REVEAL = "COMMIT_REVEAL",
    LOCKED_COMMIT_REVEAL = "LOCKED_COMMIT_REVEAL",
}

export class Parameters extends Contract {

    getAddress(class_name: KnownClasses | string, key: string): Promise<string> {
        return this.instance.getAddress.call(class_name, key);
    }

    async setAddress(class_name: KnownClasses | string, key: string, address: string): Promise<void> {
        await this.instance.setAddress(class_name, key, address);
    }
}