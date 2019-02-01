import { StakableRegistry } from './StakableRegistry';
import { SimpleRegistry } from './SimpleRegistry';
import { ChallengeableRegistry } from "./ChallengeableRegistry";

export type RegistryType = "StakableRegistry" | "SimpleRegistry" | "ChallengeableRegistry";

export const RegistryTypes = {
    "StakableRegistry": StakableRegistry,
    "SimpleRegistry": SimpleRegistry,
    "ChallengeableRegistry": ChallengeableRegistry
}