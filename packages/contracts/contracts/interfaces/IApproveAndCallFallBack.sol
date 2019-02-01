pragma solidity ^0.5.0;

contract IApproveAndCallFallBack {
    function receiveApproval(address from, uint256 _amount, address _token, bytes memory _data) public;
}

