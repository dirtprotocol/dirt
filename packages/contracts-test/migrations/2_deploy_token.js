const ProtocolToken = artifacts.require("TestProtocolToken");

module.exports = function (deployer, network) {
    deployer.deploy(ProtocolToken)
};