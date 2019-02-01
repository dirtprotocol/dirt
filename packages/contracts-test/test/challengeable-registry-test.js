const Registry = artifacts.require("TestChallengeableRegistry");
const PublicVC = artifacts.require("TestPublicVoteController");
const Utils = require('../util/contract-utils');
const TokenValue = require('@dirt/lib').TokenValue;

contract('ChallengeableRegistry', (accounts) => {

    let rawInstance = null;
    let publicVC = null;
    let users = [];

    before('Setup registry', async () => {
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

    // TODO currently anyone can expire the active state
    it("Can expire the active state", async () => {
        const key = Utils.randomName();

        const item = await users[0].registry.addItem(key, "Hello", TokenValue.from(1));
        const challenge = await users[1].registry.challenge(key, "New", TokenValue.from(2));
        let pollId = (await rawInstance.getPollId(key)).toNumber()

        assert(await publicVC.pollActive(pollId), "poll needs to be active")

        await publicVC.forceExpireActiveState(pollId)

        assert.isFalse(await publicVC.pollActive(pollId), "poll should be inactive now")
    });

    // TODO currently anyone can expire the payout state
    it("Can expire the payout state", async () => {
        const key = Utils.randomName();

        const item = await users[0].registry.addItem(key, "Hello", TokenValue.from(1));
        const challenge = await users[1].registry.challenge(key, "New", TokenValue.from(2));
        let pollId = (await rawInstance.getPollId(key)).toNumber()

        await publicVC.forceExpireActiveState(pollId)
        assert.isFalse(await publicVC.pollActive(pollId), "poll should be inactive now")

        await publicVC.resolve(pollId)
        assert.isTrue(await publicVC.pollResolved(pollId), "poll should be resolved now")

        assert.isFalse(await publicVC.pollPayoutTimeEnded(pollId), "payout should not be expired")
        await publicVC.forceExpirePayoutState(pollId)
        assert.isTrue(await publicVC.pollPayoutTimeEnded(pollId), "payout should not be expired")

    })

    it("Can edit item", async () => {
        await users[0].registry.addItem("A", "Hello World", TokenValue.from(1))
        await users[0].registry.editItem("A", "Updated Value")

        let item = await users[0].registry.item("A")

        assert.equal(item.value, "Updated Value", "Item value was not updated")
    });

    it("Allows deleting item", async () => {
        const stakeValue = TokenValue.from(1);
        await users[0].registry.addItem("C", "Hello World", stakeValue);
        await users[0].registry.deleteItem("C");
        try {
            await users[0].registry.getItemWithStake("C");
        }
        catch (e) {
            assert.ok(e, `Getting non-existent item stake throws`);
        }
    });

    it("Do not allow delete item that doesn't exist", async () => {
        try {
            await users[0].registry.deleteItem("E");
        }
        catch (e) {
            assert.ok(e, `Getting non-existent item stake throws`);
        }
    });

    it("Has a vote style set", async () => {
        const style = users[0].registry.voteStyle;
        assert.equal(style, "PUBLIC", `Vote style is set correctly`);
    });

    it("Can read vote style parameters", async () => {
        const contractAddresss = await rawInstance.testVoteStyleCreation.call();
        assert.notEqual(contractAddresss, Utils.addressZero, `Can read parameters for vote style`);
    });

    it("Remote vote controller matches configured", async () => {
        const name = await rawInstance.testVoteStyleReading.call();
        assert.equal(name, users[0].registry.voteStyle, `Can read parameters for vote style`);
    });

    it("Allows adding items with a stake", async () => {
        const key = Utils.randomName();
        const stakeValue = TokenValue.from(1);
        const item = await users[0].registry.addItem(key, "Hello World", stakeValue);

        assert.equal(item.owner, accounts[0], `Item owned by sender`);
        assert.equal(item.value, "Hello World", `Item has correct value`);
        assert.equal(item.voteId, 0, `Item has no vote id`);
        assert.equal(item.voteContract, Utils.addressZero, `Item has no vote contract.`);
        assert.equal(item.stake.value, stakeValue.value, `Stake matches request`);
    });

    it("Allows creation of challenges", async () => {

        const key = Utils.randomName();

        const initialStakeValue = TokenValue.from(1);
        const item = await users[3].registry.addItem(key, "Hello", initialStakeValue);

        assert.equal(item.stake.value, initialStakeValue.value, "Item has correct stake")

        const newStakeValue = TokenValue.from(2);
        const user1TokenValue = await users[1].dirt.Token.balanceOf();

        assert(user1TokenValue.value >= newStakeValue.value, `User 1 has tokens to challenge`);


        const challenge = await users[4].registry.challenge(key, "New", newStakeValue);

        // let incumbentVHCount = await users[3].registry.getVoteHistoryCount(users[3].address)
        // assert.equal(incumbentVHCount, 1, "voteHistoryCount for incumbent is off");
        // let challengerVHCount = await users[4].registry.getVoteHistoryCount(users[4].address)
        // assert.equal(challengerVHCount, 1, "voteHistoryCount for challenger is off");

        assert.notEqual(challenge.contract, Utils.addressZero, `Challenge contract address is valid`);

        // Vote has status in the public vote
        let voteInstance = await users[3].registry.getVoteInstance(key);
        let status = await voteInstance.getStatus();

        assert(await voteInstance.exists(), `Vote exists @ ${voteInstance.address}/${voteInstance.id}`);
        assert(await voteInstance.active(), `Vote is active @ ${voteInstance.address}/${voteInstance.id}, ts: ${status.expirationTimestamp}, block ts: ${web3.eth.getBlock(web3.eth.blockNumber).timestamp}`);

        assert.equal(status.incumbent.owner, users[3].address, 'Incumbent is account 0');
        assert.equal(status.challenger.owner, users[4].address, 'Challenger is account 1');

        assert.equal(status.incumbent.value, "Hello", 'Incumbent value is correct');
        assert.equal(status.challenger.value, "New", 'Challenger value is correct');

        assert.equal(status.incumbent.totalVoteValue.value, initialStakeValue.value, 'Incumbent vote set to initial stake');
        assert.equal(status.challenger.totalVoteValue.value, newStakeValue.value, 'Challenger vote set to new stake');
    });

    it("Allows creation of challenges from same owner", async () => {

        const key = Utils.randomName();

        const initialStakeValue = TokenValue.from(1);
        const item = await users[0].registry.addItem(key, "Hello", initialStakeValue);

        assert.equal(item.stake.value, initialStakeValue.value, "Item has correct stake")

        const newStakeValue = TokenValue.from(2);

        const challenge = await users[0].registry.challenge(key, "New", newStakeValue);

        assert.notEqual(challenge.contract, Utils.addressZero, `Challenge contract address is valid`);
    });

    it("Does not allow creation of challengers with the same stake", async () => {
        const key = Utils.randomName();

        const initialStakeValue = TokenValue.from(1);
        const item = await users[0].registry.addItem(key, "Hello", TokenValue.from(1));

        Utils.assert.callReverts(
            users[1].registry.challenge(key, "Better", TokenValue.from(1)),
            `Call to challenge should revert`);
    });

    it("Does not allow creation of challengers with a lesser stake", async () => {
        const key = Utils.randomName();

        const initialStakeValue = TokenValue.from(1);
        const item = await users[0].registry.addItem(key, "Hello", TokenValue.from(1));

        Utils.assert.callReverts(
            users[1].registry.challenge(key, "Better", TokenValue.from(0.5)),
            `Call to challenge should revert`);
    });

    it("Allows incumbent and challenger to vote", async () => {

        const key = Utils.randomName();

        const initialStakeValue = TokenValue.from(1);
        const item = await users[5].registry.addItem(key, "Hello", TokenValue.from(1));
        const challenge = await users[6].registry.challenge(key, "Better", TokenValue.from(2));

        const vote0 = await users[5].registry.getVoteInstance(key);
        const vote1 = await users[6].registry.getVoteInstance(key);

        await vote0.vote(1, TokenValue.from(2));
        await vote1.vote(2, TokenValue.from(1));

        let status = await vote1.getStatus();

        assert.equal(status.incumbent.totalVoteValue.value, 3, 'Incumbent vote has correct value');
        assert.equal(status.challenger.totalVoteValue.value, 3, 'Challenger vote has correct value');

        // let incumbentVHCount = await users[5].registry.getVoteHistoryCount(users[5].address)
        // assert.equal(incumbentVHCount, 1, "voteHistoryCount for incumbent is off");
        // let challengerVHCount = await users[6].registry.getVoteHistoryCount(users[6].address)
        // assert.equal(challengerVHCount, 1, "voteHistoryCount for challenger is off");
    });

    it("Transfers original and challange stake to voting contract", async () => {

        const key = Utils.randomName();

        const initialBalance0 = await users[0].registry.depositBalanceOf();
        const initialBalance1 = await users[1].registry.depositBalanceOf();

        // ADD ITEM
        const initialStakeValue = TokenValue.from(5);
        const item = await users[0].registry.addItem(key, "Hello", TokenValue.from(5));

        const afterAddBalance0 = await users[0].registry.depositBalanceOf();
        const expectedAfterAddBalance0 = initialBalance0.add(TokenValue.from(5));
        assert.equal(afterAddBalance0.value, expectedAfterAddBalance0.value, `Deposited value from user 0 increased`);

        // CHALLENGE ITEM
        const challenge = await users[1].registry.challenge(key, "Better", TokenValue.from(7));
        let pollId = (await rawInstance.getPollId(key)).toNumber()

        const potAmount3 = await publicVC.getPotAmount(pollId);

        const updatedBalance0 = await users[0].registry.depositBalanceOf();
        const updatedBalance1 = await users[1].registry.depositBalanceOf();

        // Balances should revert to initial within the contract
        // QUESTION don't get how this makes sense.
        assert.equal(updatedBalance0.value, initialBalance0.value, `Deposited value from user 0 decreased`);
        assert.equal(updatedBalance1.value, initialBalance1.value, `Deposited value from user 1 decreased`);

        let potAmount = await publicVC.getPotAmount(pollId)
        assert.equal(TokenValue.fromRaw(potAmount).value, 5 + 7, `Inital stake for item moved to vote contract`);
    });

    it("Allows non incumbent / challenger users to vote", async () => {
        const key = Utils.randomName();

        const initialStakeValue = TokenValue.from(1);
        const item = await users[0].registry.addItem(key, "Hello", TokenValue.from(1));
        const challenge = await users[1].registry.challenge(key, "Better", TokenValue.from(2));

        let expectedIncumbentValue = 1;
        let expectedChallengerValue = 2;
        let status = null;

        for (var i = 2; i < accounts.length - 2; i++) {

            const voteInstance = await users[i].registry.getVoteInstance(key);

            if (i % 2 == 0) {
                await voteInstance.vote(1, TokenValue.from(1));
                expectedIncumbentValue++;
            }
            else {
                await voteInstance.vote(2, TokenValue.from(1));
                expectedChallengerValue++;
            }

            status = await voteInstance.getStatus();
        }

        assert.equal(status.incumbent.totalVoteValue.value, expectedIncumbentValue, 'Incumbent vote has correct value');
        assert.equal(status.challenger.totalVoteValue.value, expectedChallengerValue, 'Challenger vote has correct value');
    });

});
