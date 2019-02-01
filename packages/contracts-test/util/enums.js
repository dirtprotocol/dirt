
const Enums = {

  // NOTE We have to mirror enums in test, because web3 abi doesn't support enums
  // https://ethereum.stackexchange.com/questions/29344/truffle-testing-enum-values
  // We may need to move these into matching files, like an IVoteController.js
  Candidate: {
    "None": 0,
    "Incumbent": 1,
    "Challenger": 2
  }

}

module.exports = Enums;