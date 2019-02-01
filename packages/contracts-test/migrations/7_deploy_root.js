const RootRegistry = artifacts.require("TestRootRegistry");
const Parameters = artifacts.require("TestParameters");
const parameterize = require("../util/parameterize");

module.exports = function (deployer, network) {

    deployer.deploy(RootRegistry, Parameters.address).then((instance) => {
        return parameterize.addressOfContract(Parameters, "CORE", "ROOT", RootRegistry);
    });
};