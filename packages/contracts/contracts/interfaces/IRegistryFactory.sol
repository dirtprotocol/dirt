pragma solidity ^0.5.0;

interface IRegistryFactory {
    function create(string calldata _voteStyle, uint256 _minStake, uint256 _minVoteStake) external returns (address _newContract);
}
