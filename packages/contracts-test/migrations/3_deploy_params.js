const parameterize = require("../util/parameterize");

const ProtocolToken = artifacts.require("TestProtocolToken");
const Parameters = artifacts.require("TestParameters");

module.exports = function (deployer, network) {
  return deployer.deploy(Parameters).then(() => {

    return Parameters.deployed()

  }).then((parametersContract) => {

    parametersContract.setAddress("CORE", "SLUSH", "0xa6aeF19880CF91E1ff8d90752EdD42f26B9f0D9e")

  }).then(() => {

    parameterize.addressOfContract(Parameters, "CORE", "TOKEN", ProtocolToken)

  });
};
