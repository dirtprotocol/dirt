pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "./interfaces/IApproveAndCallFallBack.sol";

/**
 *@title Protocol Token.
 *@author Entity Protocol
 *@notice ERC20 contrct that keeps track of all DIRT tokens
 */
contract ProtocolToken is ERC20Mintable {
    string public name = "Dirt Protocol";
    string public symbol = "DIRT";

    uint8 public decimals = 18;
    uint256 public INITIAL_SUPPLY = 1000000000 * (uint256(10) ** decimals);

    /**
    @dev Constructor, creates a new instance of the token contract
     */
    constructor() public {
        mint(msg.sender, INITIAL_SUPPLY);
        //totalSupply = INITIAL_SUPPLY;
        //_balances[msg.sender] = INITIAL_SUPPLY;
    }

    /// @notice `msg.sender` approves `_spender` to send `_amount` tokens on
    ///  its behalf, and then a function is triggered in the contract that is
    ///  being approved, `_spender`. This allows users to use their tokens to
    ///  interact with contracts in one function call instead of two
    /// @param _spender The address of the contract able to transfer the tokens
    /// @param _amount The amount of tokens to be approved for transfer
    /// @return True if the function call was successful
    function approveAndCall(
        address _spender,
        uint256 _amount,
        bytes memory _extraData
    ) public returns (bool success) {
        require(approve(_spender, _amount));

        IApproveAndCallFallBack(_spender).receiveApproval(
            msg.sender,
            _amount,
            address(this),
            _extraData
        );

        return true;
    }
}
