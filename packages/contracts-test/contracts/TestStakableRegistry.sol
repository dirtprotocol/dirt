pragma solidity ^0.5.0;

import "../node_modules/@dirt/contracts/contracts/registry/StakableRegistry.sol";
import "./Reset.sol";

contract TestStakableRegistry is StakableRegistry, Reset {

    constructor(IParameterSource _parameters, uint256 _minStake)
        public
        StakableRegistry(_parameters, _minStake) {
    }

    // AUDIT where can this be called from?
    function deleteItemsAndReturnFunds() public returns (bool) {

        for (uint i = 0; i < registry.getItemCount(); i++) {
            string memory key = registry.getKeyOfItem(i);
            tokenReceiver.withdrawTo(registry.items[key].owner, itemStakes[key]);
            delete itemStakes[key];
        }
        _resetRegistry(registry);

        return true;
    }

}
