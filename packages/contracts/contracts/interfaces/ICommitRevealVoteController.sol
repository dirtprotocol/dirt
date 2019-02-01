pragma solidity ^0.5.0;

interface ICommitRevealVoteController {
    function forceExpireRevealState(uint _voteId) external returns (bool);
}
