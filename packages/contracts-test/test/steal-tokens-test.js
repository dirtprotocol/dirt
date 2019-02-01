const Registry = artifacts.require("TestChallengeableRegistry");
const PublicVC = artifacts.require("TestPublicVoteController");
const TestPolling = artifacts.require("TestPolling.sol");
const IVoteController = artifacts.require("IVoteController.sol");
const HackStealTokens = artifacts.require("HackStealTokens.sol");
const Utils = require('../util/contract-utils');
const TokenValue = require('@dirt/lib').TokenValue;

contract('HackStealTokens', (accounts) => {

    let rawInstance = null;
    let publicVC = null;
    let users = [];

    before('Setup registry', async () => {
        stealTokens = await HackStealTokens.deployed()
        rawInstance = await Registry.deployed();
        publicVC = await PublicVC.deployed();

        users = await Utils.createAccountInstances(artifacts, web3, accounts, 500, async (user, idx) => {
            user.registry = await user.dirt.getRegistryAtAddress(rawInstance.address, "ChallengeableRegistry");
            user.dirt.Token.approveFor(user.registry.address, TokenValue.from(500));
        });
    });

    after('cleanup', async () => {
        await rawInstance.deleteItemsAndReturnFunds();
        await publicVC.resetTokenPot();
    });

    it("Cannot steal tokens by impersonating a registry", async () => {
        const key = Utils.randomName();

        const item = await users[0].registry.addItem(key, "Hello", TokenValue.from(10));

        // Unless we transfer tokens to the vote controller, our attempt to
        // call beginVote will revert when the vote controller looks at
        // the tokenPot._unattributedTokenValue and discovers that there are
        // no unattributed tokens.
        await users[0].dirt.Token.transfer(publicVC.address, {raw: 100})


        const initialHackerBalance = await users[0].dirt.Token.balanceOf()
        // In hackVote, we're able to successfully to call beginVote and
        // create a new poll for any key with arbitrary settings
        // (e.g. incumbent address, challenger address, stake amounts, etc.),
        // but this poll.origin should always be our attacker origin
        // address and not the address of an authentic registry contract.
        await stealTokens.hackVote(key, publicVC.address, 0, 0)
        const pollId = 1
        await publicVC.forceExpireActiveState(pollId)
        // Call resolve on the vote controller from our attacker contract.
        // This successfully resolves our fake poll, but the attack only
        // succeeds in returning the attacker's stake to himself. This is
        // because we call `origin.assignVoteOutcome` inside `resolve`,
        // and inside `assignVoteOutcome` we check to make sure that the
        // vote id matches a real poll for that origin registry and that
        // msg.sender is the vote controller contract that was initially
        // associated with this poll. Because the origin of our fake poll
        // is not a real registry, the attack doesn't give us any special
        // access to the registry or its funds.
        await stealTokens.resolveVote(publicVC.address, pollId)
        const finalHackerBalance = await users[0].dirt.Token.balanceOf()
        assert.equal(
          initialHackerBalance._bigNumber.toNumber(),
          finalHackerBalance._bigNumber.toNumber(),
          "No funds were stolen."
        )

    });

});
