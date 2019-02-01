pragma solidity ^0.5.0;

import "../node_modules/@dirt/contracts/contracts/registry/RegistryFactory.sol";

contract TestRegistryFactory is RegistryFactory {
    constructor(IParameterSource _parameters) public RegistryFactory(_parameters) {
    }
}