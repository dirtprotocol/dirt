pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../node_modules/@dirt/contracts/contracts/voting/CommitRevealVoteController.sol";
import "../node_modules/@dirt/contracts/contracts/interfaces/IVoteController.sol";
import "./TestIVoteController.sol";

contract TestCommitRevealVoteController is CommitRevealVoteController, TestIVoteController {
    constructor(address _parameters, address _slushAddress)
        public
        CommitRevealVoteController(_parameters, _slushAddress)
    {
        // do nothing
    }

    function forceExpire(uint _pollId) public returns (bool _success) {
        return pollData._forceExpire(_pollId);
    }

}