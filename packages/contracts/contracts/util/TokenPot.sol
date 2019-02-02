pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @author DIRT protocol
 * @title Manages a pool of ERC20 tokens to be paid out.
 * @notice Like a TokenReceiver, it keeps track of how much to payout, and
 * for whom. It just makes sure that once someone claims a payout, they
 * cannot claim it again.
 */
library TokenPot {
    using SafeMath for uint256;

    /**
     * @title contains information about a specific pot
     */
    struct Pot {
        /**
         * @title the amount already claimed by each user
         */
        mapping(address => uint256) amountClaimed;

        /**
         * @title the total pot amount
         */
         uint256 totalAmount;
    }

    struct Data {
        /**
         * @title Address of ERC20 contract
         */
        ERC20 tokenContract;

        /**
         * @title ERC20 slush account
         */
        address slushAddress;

        /**
         * @title records the pot amounts and who claimed in each pot.
         * @note keys are identifiers for each pot. In our case, it's a pollId.
         */
        mapping(uint256 => Pot) pots;

        /**
         * @title total amount deposited for all pots
         */
        uint256 totalDepositedValue;

        //@title mutex for depositing into the pot
        bool depositMutex;

        //@ittle mutex for withdrawing from the pot
        bool withdrawMutex;
    }

    event PotDeposit(address indexed owner, uint indexed pollId, uint value, uint potAmount);
    event PotWithdraw(address indexed owner, uint indexed pollId, uint value, uint potAmount);
    event PotAttribution(uint indexed pollId, uint amount, uint potAmount);

    function initialize(Data storage self, ERC20 _tokenAddress, address _slushAddress) public {
        self.tokenContract = ERC20(_tokenAddress);
        self.totalDepositedValue = 0;
        self.depositMutex = false;
        self.withdrawMutex = false;
        self.slushAddress = _slushAddress;
    }

    // External functions

    // External functions that are view

    // External functions that are pure

    // Public functions

    function potAmount(Data storage self, uint256 _pollId) public view returns (uint256) {
        return self.pots[_pollId].totalAmount;
    }

    // Internal functions

    /**
     * @notice attributes unowned tokens to the pot. Call this once after someone transferred
     * dirt tokens into the contract.
     * @dev When tokens are initially transfers to the vote controller, it's not recorded
     * in the total pot until this method is called.
     * @dev given _unattributedTokenValue returns the diff between totalDeposited and
     * the amount of token in contract, you should be able to call this multiple times.
     */
    function attributeUnownedToPot(
        Data storage self,
        uint256 _pollId,
        uint256 _value
    )
        external
        returns (bool)
    {
        /* Checks */
        require(_value > 0, "TP:aUTP:val > 0");

        //@dev unattributedTokenValue can never be negative
        uint256 unattributedTokenValue = _unattributedTokenValue(self);
        require(unattributedTokenValue >= _value, "TP:aUTP:unattrval >= val");

        /* Effects */
        self.pots[_pollId].totalAmount = self.pots[_pollId].totalAmount.add(_value);
        self.totalDepositedValue = self.totalDepositedValue.add(_value);

        /* Interactions */
        emit PotAttribution(_pollId, _value, self.pots[_pollId].totalAmount);

        return true;
    }

    /**
     * @notice deposits tokens to the poll's pot
     */
     // TODO: Only allow trusted contracts to call this.
    function depositHere(
        Data storage self,
        uint256 _pollId,
        uint256 _value,
        address _from
    )
        external
        returns (bool)
    {
        /* Checks */
        require(_value > 0, "TP:dH:val > 0");
        require(self.pots[_pollId].amountClaimed[_from] == 0, "TP:dH:amtClaimed == 0");
        require(self.depositMutex == false);

        /* Effects */

        /* Interactions */

        // We use a mutex to prevent re-entrancy, since we need the results
        // of an external call
        self.depositMutex = true;

        // need to query for actual amount transferred, because some tokens
        // take fees, so we may not get the full value amount
        uint oldBalance = self.tokenContract.balanceOf(address(this));
        require(self.tokenContract.transferFrom(_from, address(this), _value), "TP:dH:Tx");
        uint newBalance = self.tokenContract.balanceOf(address(this));
        require(newBalance >= oldBalance);
        uint amountTransferred = newBalance.sub(oldBalance);

        self.pots[_pollId].totalAmount = self.pots[_pollId].totalAmount.add(amountTransferred);
        self.totalDepositedValue = self.totalDepositedValue.add(amountTransferred);

        // release the mutex
        self.depositMutex = false;

        emit PotDeposit(_from, _pollId, amountTransferred, self.pots[_pollId].totalAmount);

        return true;
    }

    /**
     * @notice withdraws payout to address
     */
    function withdrawTo(
        Data storage self,
        uint256 _pollId,
        address _address,
        uint256 _value
    )
        external
        returns (bool)
    {

        /* Checks */
        require(_address != address(0), "TP:wT:addr0");
        require(_value <= self.pots[_pollId].totalAmount, "TP:wT:val <= pot");
        require(self.pots[_pollId].amountClaimed[_address] == 0, "TP:wT:amtClaimed == 0");
        require(self.withdrawMutex == false);

        /* Effects */

        /* Interactions */

        // we need a mutex to prevent re-entrancy
        self.withdrawMutex = true;

        // need to query for actual amount transferred, because some tokens
        // take fees, so we may not get the full value amount
        uint oldBalance = self.tokenContract.balanceOf(_address);
        require(self.tokenContract.transfer(_address, _value), "TP:dH:Wd");
        uint newBalance = self.tokenContract.balanceOf(_address);
        require(newBalance >= oldBalance);
        uint amountTransferred = newBalance.sub(oldBalance);

        self.pots[_pollId].amountClaimed[_address] = _value;
        self.pots[_pollId].totalAmount = self.pots[_pollId].totalAmount.sub(_value);
        self.totalDepositedValue = self.totalDepositedValue.sub(_value);

        // release the mutex
        self.withdrawMutex = false;

        emit PotWithdraw(_address, _pollId, amountTransferred, self.pots[_pollId].totalAmount);

        return true;
    }

    // Internal functions that are view

    /**
     * @notice Calculates the amount of tokens not attributed to any poll's pot
     */
    function _unattributedTokenValue(Data storage self)
        internal
        view
        returns (uint256)
    {
        uint256 erc20balance = self.tokenContract.balanceOf(address(this));

        //@dev if somehow totalDepositedValue > erc20balance, it will revert, which
        // is what we want.
        return erc20balance.sub(self.totalDepositedValue);
    }

    // Internal functions that are pure

    // Private functions

}
