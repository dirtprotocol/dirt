pragma solidity ^0.5.0;

/**
 * @title Registrar maintains the registry data of items
 * @notice When a registry contract needs to keep track of registry items, they
 * include this library to help enable CRUD methods.
 * @author DIRT protocol
 */
library Registrar {

    struct RegistryItem {
        uint index;
        address owner;

        /**
         * @notice This is the value associated with the key inside of the mapping
         * for Data.items.
         */
        string value;

        uint timestamp;
    }

    struct Data {
        string[] itemIndex;
        mapping(string => RegistryItem) items;
    }

    /**
     * @notice Event raised when a new item is added to the registry.
     * @param key Key of the item.
     * @param index Absolute index of the newly added item.
     * @param owner Owning address of the item.
     */
    event AddItem(string key, uint indexed index, address indexed owner);

    /**
     * @notice Event raised when an item is edited in the registry.
     * @param key Key of the item.
     * @param index Absolute index of the edited item.
     * @param owner Owning address of the item.
     */
    event EditItem(string key, uint indexed index,  address indexed owner);

    /**
     * @notice Event raised when an item is deleted from the registry.
     * @param key Key of the item.
     * @param owner Owning address of the item.
     */
    event DeleteItem(string key, address indexed owner);

    // External functions

    // External functions that are view

    // External functions that are pure

    // Public functions

    /**
     * @param _self RegistryCrud
     *@param key of registry item
     */
    function hasItem(Data storage _self, string memory _key) public view returns (bool) {
        return _self.items[_key].owner != address(0);
    }

    /**
     * @notice Web3 does not support struct returns, which is why we return multiple items
     * @param _self RegistryCrud
     *@param the key of registry item
     * @return owner Owning address of the item.
     * @return value Content of the item.
     * @return timestamp Timestamp of the item.
     *
     * @dev TODO Shouldn't this also return the key so the interface matches getAtIndex()?
     */
    function getItem(Data storage _self, string memory _key)
        public
        view
        returns (
            address owner,
            string memory value,
            uint _timestamp
        )
    {
        // Check
        RegistryItem storage item = _self.items[_key];
        require(item.owner != address(0)); //, "Item must have an owner assigned")

        // Effect
        // Interaction

        return (item.owner, item.value, item.timestamp);
    }

    /**
     * @param _self RegistryCrud
     * @param _index index of key we're looking for
     * @return key the key of the registry item
     */
    function getKeyOfItem(Data storage _self, uint _index)
        public
        view
        returns (string memory)
    {
        return _self.itemIndex[_index];
    }

    /**
     * @notice Get the item content of the specified index `_index`.
     * @notice Web3 doesn't support struct returns, so we return multiple values
     *
     * @param _self RegistryCrud
     * @param _index Index of the item to get.
     * @return key Item key.
     * @return owner Owning address of the item.
     * @return value Content of the item.
     * @return timestamp Timestamp of the item.
     */
    function getAtIndex(Data storage _self, uint _index)
        public
        view
        returns (
            string memory key,
            address owner,
            string memory value,
            uint timestamp
        )
    {
        // Checks
        require(_index < _self.itemIndex.length); // , "Index must be less than the current count of items in the registry.")

        // Effects
        (owner, value, timestamp) = getItem(_self, _self.itemIndex[_index]);

        // Interactions

        return (
            _self.itemIndex[_index],
            owner,
            value,
            timestamp
        );
    }

    /**
     * @notice Gets the total count of items in the registry.
     * @param _self RegistryCrud
     * @return _count Count of items in the registry.
     */
    function getItemCount(Data storage _self) public view returns (uint) {
        // Checks
        // Effects
        // Interactions
        return _self.itemIndex.length;
    }

    /**
     * @notice Adds an item to the registry. Will fail if an item of the same key
     *    "`_key`" already exists in the registry.
     * @notice DO NOT do a delegatecall() on addItem. Otherwise, the items will
     *    belong to the outside contract calling your method that calls addItem()
     * @notice timestamp in item is from block.timestamp and can be spoofed by miners.
     *    Don't rely on it to make algorithmic decisions in code.
     *
     * @dev This is designed to be overriden in derived contracts.

     * @param _self RegistryCrud
     *@param Item key.
     * @param _value Item value.
     * @return success True if successful, otherwise false.
     */
    // TODO: Only allow the registry to call this.
    function addItem(Data storage _self, string memory _key, string memory _value, address _from)
        public
        returns (bool)
    {
        // Checks
        require(!hasItem(_self, _key));/* , "Item must not already exist."); */

        // TODO: should we check if the msg.sender is the actual "user" of the library?

        // Effects
        RegistryItem storage item = _self.items[_key];
        item.owner = _from;
        item.timestamp = block.timestamp;
        item.value = _value;
        item.index = _self.itemIndex.length;

        _self.itemIndex.push(_key);

        // Interactions
        emit AddItem(_key, item.index, _from);

        return true;
    }

    /**
     * @notice Edits an existing item within the registry. Will fail if an item
     * of "`_key`" does not exist, and `message.caller.address()` is not marked
     * as the owner of the item.
     *
     * @param _self RegistryCrud
     *@param Key of item to edit.
     * @param _value New content for the item.
     * @return _success True if successful, otherwise false.
     */
    function editItem(Data storage _self, string memory _key, string memory _value)
        public
        returns (bool)
    {
        // Checks
        // TODO: Consider making internal?
        require(_self.items[_key].owner == msg.sender); // , "Sender of edit must be owner of item."

        // Effects
        _self.items[_key].timestamp = block.timestamp;
        _self.items[_key].value = _value;

        // Interactions
        emit EditItem(_key, _self.items[_key].index, msg.sender);

        return true;
    }

    /**
     * @notice Deletes an existing item from the registry. Will fail if an item
     * of "`_key`" exists, and `message.caller.address()` is not marked as the owner
     * of the item.
     *
     * @param _self RegistryCrud
     *@param Key of item to edit.
     * @return _success True if successful, otherwise false.
     */
    function deleteItem(Data storage _self, string memory _key)
        public
        returns (bool success)
    {
        /* Checks */
        // TODO: Consider making internal?
        require(_self.items[_key].owner == msg.sender);

        /* Effects */
        uint itemIdx = _self.items[_key].index;

        // Delete from mapping
        delete _self.items[_key];

        // If it's the last item we don't need to do a swap
        // If it's not the last item, swap the last item into the item being deleted
        uint tail = _self.itemIndex.length - 1;

        if (itemIdx < tail) {
            _self.items[_self.itemIndex[tail]].index = itemIdx;
            _self.itemIndex[itemIdx] = _self.itemIndex[tail];
        }

        delete _self.itemIndex[tail];
        _self.itemIndex.length--;

        /* Interactions */
        emit DeleteItem(_key, msg.sender);

        return true;
    }

    // Internal functions

    /**
     * @param _self RegistryCrud
     *@param Key of registry item
     * @param _owner The owner address to transfer registry item to
     * @param _newValue The new value of the registry
     * @return success True if succeeded
     */
    function transferItem(
        Data storage _self,
        string memory _key,
        address _owner,
        string memory _newValue
    )
        public
        returns (bool success)
    {
        /* Checks */
        require(hasItem(_self, _key)); /* , "Item must exist for transfer." */
        require(_owner != address(0)); /* , "New owner address must be non zero." */

        /* Effects */
        _self.items[_key].owner = _owner;
        _self.items[_key].timestamp = block.timestamp;
        _self.items[_key].value = _newValue;

        /* Interactions */

        return true;
    }


    // Private functions

}
