pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "./interfaces/IRegistryFactory.sol";
import "./interfaces/IKeyStore.sol";
import "./interfaces/IParameterSource.sol";

/**
 * @title RootRegistry
 * @author DIRT protocol
 * @notice The root registry holds a list of all existing registries. It's also
 * where you ask for new registries to be created.
 */
contract RootRegistry is IKeyStore {

    struct Registry {
        address contractAddress;
        string voteStyle;
        uint timestamp;
    }

    address public parametersAddress;

    string[] private itemIndex;
    mapping(string => Registry) private items;
    IParameterSource internal parameters;

    event RegistryCreated(string name, string voteStyle, address at);

    constructor(address _parametersAddress) public
    {
        require(_parametersAddress != address(0), "Parameter contract address must be set");
        parametersAddress = _parametersAddress;
        parameters = IParameterSource(parametersAddress);
    }

    function hasItem(string memory _key) public view returns (bool _exists) {
        if (itemIndex.length == 0) {
            return false;
        }

        return items[_key].contractAddress != address(0);
    }

    function getItem(string memory _key) public view returns (address _address, string memory _voteStyle, uint _timestamp) {
        Registry storage item = items[_key];
        require(item.contractAddress != address(0), "Item must have an owner assigned.");
        return (item.contractAddress, item.voteStyle, item.timestamp);
    }

    function getKeyOfIndex(uint _index) external view returns (string memory _key) {
        return itemIndex[_index];
    }

    function getAtIndex(uint _index) public view returns (string memory _key, address _address, string memory _voteStyle, uint _timestamp) {
        require(_index < itemIndex.length, "Index must be less than the current count of items in the registry.");

        (_address, _voteStyle, _timestamp) = getItem(itemIndex[_index]);

        return (itemIndex[_index], _address, _voteStyle, _timestamp);
    }

    function getBatchAtIndex(uint _index, uint _count) public view
        returns (uint _countFetched, string[] memory _keys, address[] memory _addresses, string[] memory _voteStyles, uint[] memory _timestamps)
    {
        require(_count > 0, "Batch count must be non-zero");
        require(_index < itemIndex.length, "Index must be with in item count bounds");

        uint maxBound = _index + _count;

        uint iter = _index;
        uint i = 0;

        string[] memory keys = new string[](_count);
        address[] memory addresses = new address[](_count);
        string[] memory voteStyles = new string[](_count);
        uint[] memory timestamps = new uint[](_count);

        for(iter = _index; iter < maxBound && iter < itemIndex.length; iter++) {
            keys[i] = itemIndex[iter];
            Registry storage item = items[_keys[i]];
            addresses[i] = item.contractAddress;
            voteStyles[i] = item.voteStyle;
            timestamps[i] = item.timestamp;
            i++;
        }

        return(i, keys, addresses, voteStyles, timestamps);
    }

    function getItemCount() external view returns (uint _count) {
        return itemIndex.length;
    }

    function create(string memory _name, string memory _voteStyle, uint _minStake, uint _minVoteStake) public returns (bool _success, address _address) {

        require(!hasItem(_name), "Registry must not already exist.");

        address factoryAddress = parameters.getAddress("REGISTRY", "FACTORY");

        IRegistryFactory factory = IRegistryFactory(factoryAddress);
        address newAddress = factory.create(_voteStyle, _minStake, _minVoteStake);

        items[_name].timestamp = block.timestamp;
        items[_name].contractAddress = newAddress;
        items[_name].voteStyle = _voteStyle;

        itemIndex.push(_name);

        emit RegistryCreated(_name, _voteStyle, newAddress);

        return (true, newAddress);
    }
}
