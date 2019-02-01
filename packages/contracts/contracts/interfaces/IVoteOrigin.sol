
pragma solidity ^0.5.0;


interface IVoteOrigin {
    function isVotePending(string calldata _key) external view returns (bool _isPending);
    function assignVoteOutcome(uint _voteId, string calldata _key, address _winner, string calldata _value, uint256 _stake) external returns (bool _success);
}
