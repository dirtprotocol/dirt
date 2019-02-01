const contract = require("truffle-contract");
const parameterize = require("../util/parameterize");

const ProtocolToken = artifacts.require("TestProtocolToken");
const Parameters = artifacts.require("TestParameters");
const Faucet = artifacts.require("TestFaucet");
const BigNumber = require('bignumber.js');


module.exports = function (deployer, network) {

    const amount = new BigNumber(100).mul(new BigNumber(10).pow(18));
    // console.log(1, amount)
    // console.log(amount.toString())

    deployer.deploy(Faucet, Parameters.address)
        .then(() => parameterize.addressOfContract(Parameters, "CORE", "FAUCET", Faucet))
        .then(() => ProtocolToken.deployed())
        .then((token) => token.transfer(Faucet.address, amount));
};
