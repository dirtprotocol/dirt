pragma solidity ^0.5.0;

import "../node_modules/@dirt/contracts/contracts/registry/Registrar.sol";

contract Reset {

    constructor() public {
    }

    function _resetRegistry(Registrar.Data storage _registry) internal {
        for (uint i = 0; i < _registry.itemIndex.length; i++) {
            delete _registry.items[_registry.itemIndex[i]];
            delete _registry.itemIndex[i];
        }
        _registry.itemIndex.length = 0;
    }

}