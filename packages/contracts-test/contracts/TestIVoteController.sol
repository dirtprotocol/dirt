pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../node_modules/@dirt/contracts/contracts/interfaces/IVoteController.sol";

contract TestIVoteController is IVoteController {
    function forceExpire(uint _pollId) public returns (bool _success);
}
