const Token = artifacts.require("TestProtocolToken.sol");
const Registry = artifacts.require("TestChallengeableRegistry.sol");
const PublicVC = artifacts.require("TestPublicVoteController");
const Utils = require('../util/contract-utils');
const Dirt = require("../util/dirt");
const TokenValue = require("@dirt/lib").TokenValue;

contract('ProtocolToken', (accounts) => {

    before('Setup registry', async () => {
        registry = await Registry.deployed();
        publicVC = await PublicVC.deployed();

        users = await Utils.createAccountInstances(artifacts, web3, accounts, 500, async (user, idx) => {
            user.registry = await user.dirt.getRegistryAtAddress(registry.address, "ChallengeableRegistry");
            user.dirt.Token.approveFor(user.registry.address, TokenValue.from(500));
        });
    });

    it("should transfer have the correct ERC20 metadata", async () => {
        const dirt = await Dirt(artifacts, web3, accounts[0]);

        assert.equal(dirt.Token.name, "Dirt Protocol");
        assert.equal(dirt.Token.symbol, "DIRT");

        assert.ok(Number.isSafeInteger(dirt.Token.decimals));
        assert.equal(dirt.Token.decimals, 18, `Decimals should be set as a integer value`);

        assert.ok(dirt.Token.totalSupply > 0, `Total supply should be set`);
    });

    it("should allocate all supply to the owner", async () => {
        const dirt = await Dirt(artifacts, web3, accounts[0]);

        const ownerBalance = await dirt.Token.balanceOf();

        assert.ok(dirt.Token.totalSupply.value > 0, `Total supply is non-zero`);
        assert.ok(ownerBalance.value > 0, `Account ${accounts[0]} has initial supply`);
    });

    it("should transfer tokens between accounts", async () => {
        const dirt1 = await Dirt(artifacts, web3, accounts[0]);
        const dirt2 = await Dirt(artifacts, web3, accounts[1]);

        const transferAmount = 100;

        const originalBalances = [
            (await dirt1.Token.balanceOf()).value,
            (await dirt2.Token.balanceOf()).value
        ];

        assert.notEqual(originalBalances[0], originalBalances[1]);

        await dirt1.Token.transfer(accounts[1], TokenValue.from(transferAmount));

        const updatedBalances = [
            (await dirt1.Token.balanceOf()).value,
            (await dirt2.Token.balanceOf()).value
        ];

        const expectedAccount1 = originalBalances[0] - transferAmount;
        const expectedAccount2 = originalBalances[1] + transferAmount;

        assert.equal(updatedBalances[0], expectedAccount1, `Balance updated for sender ${accounts[0]}`);
        assert.equal(updatedBalances[1], expectedAccount2, `Balance updated for recipient ${accounts[1]}`);
    });

    it("should allow approveAndCall", async () => {

        const dirt1 = await Dirt(artifacts, web3, accounts[0]);
        const dirt2 = await Dirt(artifacts, web3, accounts[1]);

        const initialStakeValue = TokenValue.from(1);
        const item = await users[3].registry.addItem("Spain", "Lisbon", initialStakeValue);

        assert.equal(
          item.stake.value, initialStakeValue.value, "Item has correct stake"
        );

        token = await Token.deployed();
        const transferAmount = 10;
        const challenge = await users[0].registry.challenge(
          'Spain', 'Madrid', TokenValue.from(20)
        );

        // Vote has status in the public vote
        let voteInstance = await users[3].registry.getVoteInstance('Spain');
        let status = await voteInstance.getStatus();
        assert(
          await voteInstance.exists(),
          `Vote exists @ ${voteInstance.address}/${voteInstance.id}`
        );
    });

});
