const Utils = require('../util/contract-utils');
const Dirt = require("../util/dirt");

contract('RootRegistry', (accounts) => {

    let dirt = null;

    beforeEach('Attach', async () => {
        dirt = await Dirt(artifacts, web3, accounts);
    });

    it("Allows can read parameters", async () => {
        let registryResult = await dirt.Root.instance.testFactoryCreate.call();
        assert.ok(registryResult, `Registry can read factory address`);
    });


    it("Allows creating a new registry (PUBLIC)", async () => {
        let name = Utils.randomName("root-registry-");
        let registry = await dirt.Root.create(name, "PUBLIC", 10, 1);

        assert.equal(registry.name, name, `Registry name set correctly`);
        assert.ok(registry.address, `Registry has address`);
        assert.ok(registry.address != '0', `Registry has valid address`);
    });

    it("Allows creating a new registry (COMMIT_REVEAL)", async () => {
        let name = Utils.randomName("root-registry-");
        let registry = await dirt.Root.create(name, "COMMIT_REVEAL", 10, 1);

        assert.equal(registry.name, name, `Registry name set correctly`);
        assert.ok(registry.address, `Registry has address`);
        assert.ok(registry.address != '0', `Registry has valid address`);
    });

    it("Allows creating a new registry (LOCKED_COMMIT_REVEAL)", async () => {
        let name = Utils.randomName("root-registry-");
        let registry = await dirt.Root.create(name, "LOCKED_COMMIT_REVEAL", 10, 1);

        assert.equal(registry.name, name, `Registry name set correctly`);
        assert.ok(registry.address, `Registry has address`);
        assert.ok(registry.address != '0', `Registry has valid address`);
    });

    it("Does not allow creating a duplicate registry", async () => {
        let name = Utils.randomName("root-registry-");
        let registry = await dirt.Root.create(name, "PUBLIC", 10, 1);

        assert.equal(registry.name, name, `Registry name set correctly`);

        await Utils.assert.callReverts(
            dirt.Root.create(name, "PUBLIC", 10, 1),
            `Creation of duplicate registry reverts`);
    });

    it("Creates a valid registry instance", async () => {
        let name = Utils.randomName("root-registry-");
        let registry = await dirt.Root.create(name, "PUBLIC", 10, 1);

        // TODO: Update!
        let instance = await dirt.getRegistryAtAddress(registry.address, "StakableRegistry");
        let currentCount = await instance.count();

        assert.equal(currentCount, 0, `Registry is empty`);
    });
});
