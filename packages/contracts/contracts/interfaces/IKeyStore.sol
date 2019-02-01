pragma solidity ^0.5.0;

contract IKeyStore {
    function hasItem(string memory _key) public view returns (bool _exists);
    function getKeyOfIndex(uint _index) external view returns (string memory _key);
    function getItemCount() external view returns (uint _count);
}
