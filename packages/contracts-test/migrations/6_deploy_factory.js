const parameterize = require("../util/parameterize");

const RegistryFactory = artifacts.require("TestRegistryFactory");
const Registrar = artifacts.require("Registrar");
const TokenReceiver = artifacts.require("TokenReceiver");
const Parameters = artifacts.require("TestParameters");

module.exports = function (deployer, network) {
    deployer.deploy(Registrar);
    deployer.deploy(TokenReceiver);

    deployer.link(Registrar, RegistryFactory);
    deployer.link(TokenReceiver, RegistryFactory);

    deployer.deploy(RegistryFactory, Parameters.address).then((instance) => {
        return parameterize.addressOfContract(Parameters, "REGISTRY", "FACTORY", RegistryFactory);
    });
};