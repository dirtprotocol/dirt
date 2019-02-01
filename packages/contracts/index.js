// Find everything in "build/contracts" and add it as an export
const map = {
    contracts: {
        Parameters: require("./build/contracts/Parameters.json"),
        ProtocolToken: require("./build/contracts/ProtocolToken.json"),
        RootRegistry: require("./build/contracts/RootRegistry.json"),
        ChallengeableRegistry: require("./build/contracts/ChallengeableRegistry.json"),
        StakableRegistry: require("./build/contracts/StakableRegistry.json"),
        RegistryFactory: require("./build/contracts/RegistryFactory.json"),
        PublicVoteController: require("./build/contracts/PublicVoteController.json"),
        Polling: require("./build/contracts/Polling.json"),
        CommitRevealVoteController: require("./build/contracts/CommitRevealVoteController.json"),
        LockedCommitRevealVoteController: require("./build/contracts/LockedCommitRevealVoteController.json"),        
        VotePayout: require("./build/contracts/VotePayout.json"),
        IVoteController: require("./build/contracts/IVoteController.json"),
        IVoteOrigin: require("./build/contracts/IVoteOrigin.json"),
        IRegistryFactory: require("./build/contracts/IRegistryFactory.json"),

        Faucet: require("./build/contracts/Faucet.json"),
    }
};

module.exports = map;

