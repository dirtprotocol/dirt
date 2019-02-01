
const Lib = require('@dirt/lib');

class ArtifactContractProvider {

    constructor(artifacts) {
        if (!artifacts) {
            throw new Error('Truffle artifacts instance must be provided')
        }

        this.artifacts = artifacts;
    }

    get(web3, name, address) {
        let artifcat = this.artifacts.require(name);

        if (address) {
            return artifcat.at(address);
        }

        return artifcat.deployed();
    }
}

module.exports = function (artifacts, web3, accounts) {

    if (!artifacts) {
        throw new Error('Truffle artifacts instance must be provided')
    }
    else if (!web3) {
        throw new Error("Truffle web3 instance must be provided")
    }
    else if (!accounts) {
        throw new Error("Truffle accounts must be provided")
    }

    return Lib.Dirt.create({
        web3: {
            instance: web3,
            account: Array.isArray(accounts) ? accounts[0] : accounts
        },
        trace: !!process.env['DIRT_TRACE'],
        rootContractName: "TestRootRegistry",
        contractProvider: new ArtifactContractProvider(artifacts)
    });
};