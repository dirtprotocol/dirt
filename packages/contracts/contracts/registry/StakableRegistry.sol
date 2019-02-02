pragma solidity ^0.5.0;

import "./Registrar.sol";
import "../util/TokenReceiver.sol";

import "../interfaces/IParameterSource.sol";
import "../interfaces/IKeyStore.sol";

/**
 * @title StakableRegistry
 * @author DIRT Protocol
 * @notice A type of registry where you can stake claims to the items in the registry.
 */
contract StakableRegistry is IKeyStore {

    using Registrar for Registrar.Data;
    using TokenReceiver for TokenReceiver.Data;

    Registrar.Data internal registry;
    TokenReceiver.Data internal tokenReceiver;

    uint256 public minStakeValue;

    address tokenAddress;

    mapping(string => uint256) internal itemStakes;

    constructor(IParameterSource _parametersAddress, uint256 _minStakeValue)
        public
    {
        require(_minStakeValue >= 0);
        minStakeValue = _minStakeValue;
        tokenAddress = IParameterSource(_parametersAddress).getAddress("CORE", "TOKEN");
        ERC20 tokenContract = ERC20(tokenAddress);
        tokenReceiver.initialize(tokenContract);
    }

    // TODO: Remove executeCall
    function executeCall(address to, uint256 value, bytes memory data) internal returns (bool success) {
      assembly {
        success := call(gas, to, value, add(data, 0x20), mload(data), 0, 0)
      }
    }

    function receiveApproval(
        address from, uint256 _amount, address _token, bytes memory _data
    )
        public
    {
        require(msg.sender == tokenAddress);
        require(_amount > 0);
        bytes4 first = bytes4(_data[0]);
        bytes4 second = bytes4(_data[1]) >> 8;
        bytes4 third = bytes4(_data[2]) >> 16;
        bytes4 fourth = bytes4(_data[3]) >> 24;
        bytes4 firstFourBytes = first | second | third | fourth;
        require(firstFourBytes == 0x6a44bcc8 || firstFourBytes == 0x692fe6ad);
        // TODO: Replace executeCall
        require(executeCall(address(this), 0, _data));
    }

    // External functions

    // External functions that are view

    // External functions that are pure

    // Public functions

    function hasItem(string memory _key) public view returns (bool _exists) {
        return registry.hasItem(_key);
    }

    //@dev TODO function method names getKeyofIndex and getKeyOfItem don't match
    function getKeyOfIndex(uint _index) external view returns (string memory) {
        return registry.getKeyOfItem(_index);
    }

    function getItemCount() external view returns (uint) {
        return registry.getItemCount();
    }


    function getItemStake(string memory _key) public view returns (uint256) {
        return itemStakes[_key];
    }

    function getItemWithStake(string  memory _key)
        public
        view
        returns (
            address _owner,
            string memory _value,
            uint _timestamp,
            uint256 _stake
        )
    {
        (_owner, _value, _timestamp) = registry.getItem(_key);
        _stake = itemStakes[_key];
    }

    function getAtIndexWithStake(uint _index)
        public
        view
        returns (
            string memory _key,
            address _owner,
            string memory _value,
            uint _timestamp,
            uint256 _stake
        )
    {
        (_key, _owner, _value, _timestamp) = registry.getAtIndex(_index);
        _stake = itemStakes[_key];
    }

    /**
     * @notice Adds an item to the registry, and locks the staking value from withdraw.
     *Will fail if an item of the same key "`_key`" already exists in the registry.
     *Will fail if stake value `_stake` is less than the minimum staking value.
     *Will fail if `message.caller.address()` has not deposited stake value `_stake` in this contract.
     * @param _key Item key.
     * @param _value Item value.
     * @param _stake Token stake amount.
     * @return _success True if successful, otherwise false.
    */
    // TODO: Only this contract should be able to call this function.
    function addItem(string memory _key, string memory _value, uint256 _stake, address _from)
        public
        returns (bool)
    {
        /* Checks */
        require(_stake >= minStakeValue);

        /* Effects */
        registry.addItem(_key, _value, _from);
        itemStakes[_key] = _stake;

        /* Interactions */
        // TODO: Cleanup
        require(tokenReceiver.depositHere(_stake, _from));

        return true;
    }

   /**
    * @notice Deletes an item to the registry, and withdraws stake amount to owner.
    *Will fail if an item of the  key "`_key`" does not exist.
    *Will fail if `message.caller.address()` is not the marked as the owner of the item.
    * @param _key Item key to delete.
    * @return _success True if successful, otherwise false.
    *
    * @dev we use a mutex here, because we want to be explicit about who we withdraw
    * to and how much, which means we need to delete it after the transfer.
    */
    function deleteItem(string memory _key) public returns (bool) {
        /* Checks */

        // Require we have knowledge of this item
        require(itemStakes[_key] > 0);

        /* Effects */


        /* Interactions */
        //@dev violation of encapsulation here, by reaching into registry and
        // getting owner, for the sake of brevity.
        //@dev Return the stake back to the sender
        //@dev It is still deposited in this contract and will need to be withdrawn
        require(tokenReceiver.withdrawTo(registry.items[_key].owner, itemStakes[_key]));

        require(registry.deleteItem(_key));
        delete itemStakes[_key]; // Remove the stake entry

        return true;
    }

    // Public functions that are view

    function depositBalanceOf(address _address) public view returns (uint256) {
        return tokenReceiver.depositBalanceOf(_address);
    }



    // Internal functions

    /**
     * @notice When a vote is resolved, and a winner picked, the item with a
     * new value and staked amount should be transferred to a new owner
     *
     * @dev we actually just overwrite the values to the new owners. The original
     * values by the losing candidate is determined in votePayout, and will need
     * to be withdrawn.
     */
    function _transferItem(string memory _key, address _newOwner, string memory _newValue, uint256 _newStake)
        internal
        returns (bool)
    {
        require(itemStakes[_key] > 0); /* , "Item must exist to transfer." */
        require(registry.transferItem(_key, _newOwner, _newValue)); /* , "Base contract must successfully transfer ownership." */

        itemStakes[_key] = _newStake;

        return true;
    }

    // Private functions
    // ...

}
