const Utils = require('../util/contract-utils');
const Dirt = require("../util/dirt");

contract('Parameters', (accounts) => {

    let dirt = null;

    before('Setup Dirt instance', async () => {
        dirt = await Dirt(artifacts, web3, accounts);
    });

    it("It should have CORE/TOKEN defined", async () => {
        // Add an item
        let value = await dirt.Parameters.getAddress("CORE", "TOKEN");
        assert.notEqual(value, Utils.emptyAddress, `TOKEN is defined in parameters`);
        assert.equal(value, dirt.Token.address, `TOKEN points to correct location`);
    });

    it("It should have CORE/ROOT defined", async () => {
        // Add an item
        let value = await dirt.Parameters.getAddress("CORE", "ROOT");
        assert.notEqual(value, Utils.emptyAddress, `ROOT is defined in parameters`);
        assert.equal(value, dirt.Root.address, `ROOT points to correct location`);
    });

    it("It should have REGISTRY/FACTORY defined", async () => {
        // Add an item
        let value = await dirt.Parameters.getAddress("REGISTRY", "FACTORY");
        assert.notEqual(value, Utils.emptyAddress, `REGISTRY/FACTORY is defined in parameters`);
    });

    it("It should have VOTE/PUBLIC defined", async () => {
        // Add an item
        let value = await dirt.Parameters.getAddress("VOTE", "PUBLIC");
        assert.notEqual(value, Utils.emptyAddress, `VOTE/PUBLIC is defined in parameters`);
    });

    it("It should have VOTE/COMMIT_REVEAL defined", async () => {
        // Add an item
        let value = await dirt.Parameters.getAddress("VOTE", "COMMIT_REVEAL");
        assert.notEqual(value, Utils.emptyAddress, `VOTE/COMMIT_REVEAL is defined in parameters`);
    });

    it("It should have VOTE/LOCKED_COMMIT_REVEAL defined", async () => {
        // Add an item
        let value = await dirt.Parameters.getAddress("VOTE", "LOCKED_COMMIT_REVEAL");
        assert.notEqual(value, Utils.emptyAddress, `VOTE/LOCKED_COMMIT_REVEAL is defined in parameters`);
    });

    it("It can set address values", async () => {
        // Add an item
        await dirt.Parameters.setAddress("TEST", "TEST_VALUE", '0x5');
        let value = await dirt.Parameters.getAddress("TEST", "TEST_VALUE");
        assert.equal(value, '0x0000000000000000000000000000000000000005', `REGISTRY_FACTORY is defined in parameters`);
    });
});
