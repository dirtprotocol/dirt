pragma solidity ^0.5.0;

import "../node_modules/@dirt/contracts/contracts/registry/Registrar.sol";
import "./Reset.sol";

contract TestRegistrar is Reset {
  using Registrar for Registrar.Data;

  Registrar.Data internal _registry;

  // NOTE for now, don't do anything fancy and just bang out the interface delegation

  function hasItem(string memory _key) public view returns (bool _exists) {
    return _registry.hasItem(_key);
  }

  function getItem(string memory _key) public view returns (address owner, string memory value, uint _timestamp) {
    return _registry.getItem(_key);
  }

  function getKeyOfItem(uint _index) public view returns (string memory) {
    return _registry.getKeyOfItem(_index);
  }

  function getAtIndex(uint _index) public view returns (string memory key, address owner, string memory value, uint timestamp) {
    return _registry.getAtIndex(_index);
  }

  function getItemCount() public view returns (uint) {
    return _registry.getItemCount();
  }

  function addItem(string memory _key, string memory _value) public returns (bool) {
    return _registry.addItem(_key, _value, msg.sender);
  }

  function editItem(string memory _key, string memory _value) public returns (bool) {
    return _registry.editItem(_key, _value);
  }

  function deleteItem(string memory _key) public returns (bool) {
    return _registry.deleteItem(_key);
  }

  function transferItem(string memory _key, address _owner, string memory _newValue) public returns (bool) {
    return _registry.transferItem(_key, _owner, _newValue);
  }

  function _reset() public {
    _resetRegistry(_registry);
  }
}
