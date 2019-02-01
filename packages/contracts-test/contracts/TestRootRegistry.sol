pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../node_modules/@dirt/contracts/contracts/RootRegistry.sol";
import "../node_modules/@dirt/contracts/contracts/interfaces/IRegistryFactory.sol"; 

contract TestRootRegistry is RootRegistry {
    constructor(address _parameters) public RootRegistry(_parameters) {
    }

    function testFactoryCreate() public returns (bool) {
        
        address factoryAddress = parameters.getAddress("REGISTRY", "FACTORY");
        require(factoryAddress != address(0));
        IRegistryFactory factory = IRegistryFactory(factoryAddress);
        require(address(factory) != address(0));
        return true;
    }
}