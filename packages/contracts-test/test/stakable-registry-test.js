const Registry = artifacts.require("./test/TestStakableRegistry.sol");
const Token = artifacts.require("./test/TestProtocolToken.sol");
const Utils = require('../util/contract-utils');
const Dirt = require("../util/dirt");
const TokenValue = require('@dirt/lib').TokenValue;



contract('StakableRegistry', (accounts) => {

    let registry = null;
    let helper;
    let token;

    beforeEach('Setup registry', async () => {
        helper = await Registry.deployed();
        token = await Token.deployed();
        await helper.deleteItemsAndReturnFunds();
        const dirt = await Dirt(artifacts, web3, accounts);
        registry = await dirt.getRegistryAtAddress(helper.address, "StakableRegistry");
    });

    it("Fails if adding item without stake value", async () => {

        // TODO: The error is not thrown at the VM level, we need to validate
        // that addItem is not actually callable without wrappers.
        try {
            const addItemTx = await registry.addItem("A", "Hello World");
            assert.fail(`Adding items without stake is not allowed`);
        }
        catch (e) {
            assert.ok(e, `Adding items without stake throws`);
        }
    });

    it("Allows adding items with a stake", async () => {
        const stakeValue = TokenValue.from(1);
        const item = await registry.addItem("B", "Hello World", stakeValue);

        assert.equal(item.stake.value, stakeValue.value, `Stake matches request`);
        assert.equal(item.owner, accounts[0], `Item owned by sender`);
        assert.equal(item.value, "Hello World", `Item has correct value`);
    });

    it("Fails adding items with a stake less than the minimum", async () => {
        const minValue = registry.minimumStake;
        const stakeValue = minValue.sub(0.0001);

        await Utils.assert.callReverts(registry.addItem("B", "Hello World", stakeValue));
    });

    it("Allows deleting item", async () => {
        const stakeValue = TokenValue.from(1);
        await registry.addItem("C", "Hello World", stakeValue);
        await registry.deleteItem("C");
        try {
            await registry.getItemWithStake("C");
        }
        catch (e) {
            assert.ok(e, `Getting non-existent item stake throws`);
        }
    });
});
