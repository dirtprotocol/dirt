
const ProtocolToken = artifacts.require("TestProtocolToken");
const RootRegistry = artifacts.require("TestRootRegistry");

const TestTokenReceiver = artifacts.require("TestTokenReceiver");
const TestStakableRegistry = artifacts.require("TestStakableRegistry");

const TestChallengeableRegistry = artifacts.require("TestChallengeableRegistry");
const TestChallengeableRegistryCommit = artifacts.require("TestChallengeableRegistryCommit");
const TestChallengeableRegistryLockedCommit = artifacts.require("TestChallengeableRegistryLockedCommit");
const TestRegistrar = artifacts.require("TestRegistrar")
const TestPolling = artifacts.require("TestPolling")
const HackStealTokens = artifacts.require("HackStealTokens")
const TestVotePayout = artifacts.require("TestVotePayout")
const TestTokenPot = artifacts.require("TestTokenPot")

const Parameters = artifacts.require("TestParameters");

const Registrar = artifacts.require("Registrar")
const Polling = artifacts.require("Polling")
const TokenReceiver = artifacts.require("TokenReceiver")
const TokenPot = artifacts.require("TokenPot")
const VotePayout = artifacts.require("VotePayout")

module.exports = function (deployer, network) {
    // FIXME reading from parameters gives weird effects. so hardcoding here.
    let slushAddress = "0xa6aeF19880CF91E1ff8d90752EdD42f26B9f0D9e"

    // TODO replace with runGuard
    if (network == 'local' || network == 'local_ganache') {
        deployer.link(Polling, TestPolling)
        deployer.deploy(TestPolling)
        deployer.deploy(HackStealTokens)

        deployer.link(VotePayout, TestVotePayout);
        deployer.link(Polling, TestVotePayout);
        deployer.deploy(TestVotePayout);

        deployer.link(Registrar, TestStakableRegistry);
        deployer.link(Registrar, TestChallengeableRegistry);
        deployer.link(Registrar, TestChallengeableRegistryCommit);
        deployer.link(Registrar, TestChallengeableRegistryLockedCommit);
        deployer.link(Registrar, TestRegistrar);
        deployer.link(TokenPot, TestTokenPot);
        deployer.link(TokenReceiver, TestStakableRegistry);
        deployer.link(TokenReceiver, TestChallengeableRegistry);
        deployer.link(TokenReceiver, TestChallengeableRegistryCommit);
        deployer.link(TokenReceiver, TestChallengeableRegistryLockedCommit);
        deployer.link(TokenReceiver, TestTokenReceiver);

        deployer.deploy(TestTokenReceiver, ProtocolToken.address);
        deployer.deploy(TestTokenPot, ProtocolToken.address, slushAddress);
        deployer.deploy(TestRegistrar);
        deployer.deploy(TestStakableRegistry, Parameters.address, 1*10**15);
        deployer.deploy(TestChallengeableRegistry, Parameters.address);
        deployer.deploy(TestChallengeableRegistryCommit, Parameters.address);
        deployer.deploy(TestChallengeableRegistryLockedCommit, Parameters.address);
    }

};
