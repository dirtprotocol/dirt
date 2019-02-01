pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../node_modules/@dirt/contracts/contracts/voting/LockedCommitRevealVoteController.sol";
import "../node_modules/@dirt/contracts/contracts/interfaces/IVoteController.sol";
import "./TestIVoteController.sol";

contract TestLockedCommitRevealVoteController is LockedCommitRevealVoteController, TestIVoteController {
    constructor(address _parameters, address _slushAddress)
        public
        LockedCommitRevealVoteController(_parameters, _slushAddress)
    {
        // do nothing
    }

    function forceExpire(uint _pollId) public returns (bool _success) {
        return pollData._forceExpire(_pollId);
    }

}