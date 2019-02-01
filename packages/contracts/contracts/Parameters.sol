pragma solidity ^0.5.0;

import "./interfaces/IParameterSource.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 *@title Parameters
 *@author DIRT protocol
 *@notice Stores many of the addresses to contracts in the DIRT protocol, and
 * other parameters and settings. In the future, we can store settings in here.
 *@dev TODO: Consider multiple ownership or hertiable
 */
contract Parameters is Ownable, IParameterSource {

    mapping(string => mapping(string => address)) private addresses;
    mapping(string => mapping(string => uint256)) private uints;
    mapping(string => mapping(string => string)) private strings;

    function getAddress(string calldata _class, string calldata _name) external view returns (address) {
        return addresses[_class][_name];
    }

    function getUInt(string calldata _class, string calldata _name) external view returns (uint256) {
        return uints[_class][_name];
    }

    function getString(string calldata _class, string calldata _name) external view returns (string memory) {
        return strings[_class][_name];
    }

    function setAddress(string memory _class, string memory _name, address _value) public onlyOwner returns (bool) {
        addresses[_class][_name] = _value;
        return true;
    }

    function setUInt(string memory _class, string memory _name, uint256 _value) public onlyOwner returns (bool) {
        uints[_class][_name] = _value;
        return true;
    }

    function setString(string memory _class, string memory _name, string memory _value) public onlyOwner returns (bool) {
        strings[_class][_name] = _value;
        return true;
    }
}
