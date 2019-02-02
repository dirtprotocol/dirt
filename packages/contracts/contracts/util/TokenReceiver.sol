pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title TokenReceiver interface
 * @author DIRT Protocol
 * @dev Provides methods to transfer ERC20 tokens to this contract if senders
 *     authorize this contract to act on their behalf. Provides book keeping
 *     for the amount of tokens "locked" into the contract for each sender.
 */
library TokenReceiver {
    using SafeMath for uint256;

    struct Data {
        //@title Address of the ERC20 contract
        ERC20 tokenContract;

        //@title Gets the total value held in this contract
        uint256 totalDepositedValue;

         //@title Mapping of senders to how much has been transferred on their behalf.
        mapping(address => uint256) deposits;

        //@title prevent reentrancy withdrawals
        bool withdrawMutex;
    }

    event Deposited(address indexed owner, uint256 indexed value, uint256 currentDeposit);
    event Attributed(address indexed owner, uint256 indexed value, uint256 currentDeposit);
    event Withdraw(address indexed owner, uint256 indexed value, uint256 currentDeposit);
    event Transfer(address indexed from, address indexed to, uint256 indexed value, uint fromCurrentDeposit, uint toCurrentDeposit);

    function initialize(Data storage self, ERC20 _tokenContract) public {
        self.tokenContract = _tokenContract;
        self.withdrawMutex = false;
    }

    /**
     * @notice Calculates the amount of tokens not attributed to anyone
     */
    function unattributedTokenValue(Data storage self) public view returns (uint256 _value) {
        uint256 erc20balance = self.tokenContract.balanceOf(address(this));
        return erc20balance.sub(self.totalDepositedValue);
    }

    /**
     * @notice Returns the amount deposited that's attributed to someone
     */
    function depositBalanceOf(Data storage self, address _address) public view returns (uint256) {
        return self.deposits[_address];
    }

    /**
     * @notice Attribute unowned token amount to someone. A Safe version of attribute that
     * coordinates with amount in token contract
     */
    function attributeUnowned(Data storage self, address owner, uint256 _value) public returns (bool) {
        require(_value > 0);

        uint256 current = unattributedTokenValue(self);

        require(_value <= current);
        _attribute(self, owner, _value);

        emit Attributed(owner, _value, depositBalanceOf(self, owner));
        return true;
    }

    function depositHere(Data storage self, uint256 _value, address _from) public returns (bool) {
        /* Checks */
        require(self.tokenContract.balanceOf(_from) >= _value);

        /* Effects */
        _attribute(self, _from, _value);

        /* Interactions */
        // FIXME the _value amount may not be what gets transferred
        require(self.tokenContract.transferFrom(_from, address(this), _value));

        emit Deposited(_from, _value, depositBalanceOf(self, _from));

        return true;
    }

    /**
     * @notice Attribute token amount to someone. Only for internal use
     */
    function _attribute(Data storage self, address _owner, uint256 _value) public {
        self.deposits[_owner] = self.deposits[_owner].add(_value);
        self.totalDepositedValue = self.totalDepositedValue.add(_value);
    }

    /**
     * @notice Withdraws tokens out of token receiver back to attributed owner
     */
    function withdrawTo(Data storage self, address _address, uint256 _value) public returns (bool) {

        /* Checks */
        require(_address != address(0));
        require(self.deposits[_address] >= _value);
        require(self.withdrawMutex == false);

        /* Effects */
        self.withdrawMutex = true;

        /* Interactions */
        uint oldBalance = self.tokenContract.balanceOf(address(this));
        require(self.tokenContract.transfer(_address, _value));
        uint newBalance = self.tokenContract.balanceOf(address(this));
        require(oldBalance >= newBalance);
        uint amountTransferred = oldBalance.sub(newBalance);

        self.deposits[_address] = self.deposits[_address].sub(amountTransferred);
        self.totalDepositedValue = self.totalDepositedValue.sub(amountTransferred);

        self.withdrawMutex = false;

        emit Withdraw(_address, amountTransferred, depositBalanceOf(self, _address));
        return true;
    }

    /**
     * @notice Transfers deposited amount between two addresses, but within the TokenReceiver
     */
    function transferDeposit(Data storage self, address _from, address _to, uint256 _value) public returns (bool) {
        require(_from != address(0));
        require(_to != address(0));
        require(_from != _to);
        require(self.deposits[_from] >= _value);

        self.deposits[_from] = self.deposits[_from].sub(_value);
        self.deposits[_to] = self.deposits[_to].add(_value);

        emit Transfer(_from, _to, _value, depositBalanceOf(self, _from), depositBalanceOf(self, _to));
        return true;
    }

}
