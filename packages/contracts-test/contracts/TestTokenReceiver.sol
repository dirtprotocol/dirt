pragma solidity ^0.5.0;

import "../node_modules/@dirt/contracts/contracts/util/TokenReceiver.sol";

contract TestTokenReceiver {
    using TokenReceiver for TokenReceiver.Data;

    TokenReceiver.Data internal _tokenReceiver;

    constructor(ERC20 _tokenAddress) public {
        _tokenReceiver.initialize(_tokenAddress);
    }

    function testDepositHere(uint256 _value) public returns (bool result) {
        return _tokenReceiver.depositHere(_value, address(0));
    }

    function testWithdrawTo(address _address, uint256 _value) public returns (bool result) {
        return _tokenReceiver.withdrawTo(_address, _value);
    }

    function testTransfer(address _from, address _to, uint256 _value) public returns (bool result) {
        return _tokenReceiver.transferDeposit(_from, _to, _value);
    }

    function testGetTokenValue(address _address) public view returns (uint256 _value) {
        return _tokenReceiver.depositBalanceOf(_address);
    }
}
