pragma solidity ^0.5.0;

interface IParameterSource {
    function getAddress(string calldata _class, string calldata _name) external view returns (address);
    function getUInt(string calldata _class, string calldata _name) external view returns (uint256);
    function getString(string calldata _class, string calldata _name) external view returns (string memory);
}
