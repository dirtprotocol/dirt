pragma solidity ^0.5.0;

import "../node_modules/@dirt/contracts/contracts/Faucet.sol";

contract TestFaucet is Faucet { 
    constructor(address _parameters) public Faucet(_parameters) {
    }
}