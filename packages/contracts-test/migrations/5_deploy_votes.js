const parameterize = require("../util/parameterize");

const PublicVoteController = artifacts.require("TestPublicVoteController");
const CommitRevealVoteController = artifacts.require("TestCommitRevealVoteController");
const LockedCommitRevealVoteController = artifacts.require("TestLockedCommitRevealVoteController");

const Polling = artifacts.require("Polling");
const VotePayout = artifacts.require("VotePayout");
const TokenPot = artifacts.require("TokenPot");

const Parameters = artifacts.require("TestParameters");

module.exports = function (deployer, network) {
    // FIXME reading from parameters gives weird effects. so hardcoding here.
    let slushAddress = "0xa6aeF19880CF91E1ff8d90752EdD42f26B9f0D9e"
    deployer.deploy(Polling);

    deployer.link(Polling, VotePayout);
    deployer.deploy(VotePayout);

    deployer.deploy(TokenPot);

    deployer.link(VotePayout, PublicVoteController);
    deployer.link(Polling, PublicVoteController);
    deployer.link(TokenPot, PublicVoteController);
    deployer.deploy(PublicVoteController, Parameters.address, slushAddress).then(() => {
        return parameterize.addressOfContract(Parameters, "VOTE", "PUBLIC", PublicVoteController);
    });

    deployer.link(VotePayout, CommitRevealVoteController);
    deployer.link(Polling, CommitRevealVoteController);
    deployer.link(TokenPot, CommitRevealVoteController);
    deployer.deploy(CommitRevealVoteController, Parameters.address, slushAddress).then(() => {
        return parameterize.addressOfContract(Parameters, "VOTE", "COMMIT_REVEAL", CommitRevealVoteController);
    });

    deployer.link(VotePayout, LockedCommitRevealVoteController);
    deployer.link(Polling, LockedCommitRevealVoteController);
    deployer.link(TokenPot, LockedCommitRevealVoteController);
    deployer.deploy(LockedCommitRevealVoteController, Parameters.address, slushAddress).then(() => {
        return parameterize.addressOfContract(Parameters, "VOTE", "LOCKED_COMMIT_REVEAL", LockedCommitRevealVoteController);
    });
};
