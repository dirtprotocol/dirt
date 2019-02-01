pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IParameterSource.sol";

/**
 *@dev only deployed on testnets
 */
contract Faucet {

    IParameterSource private parameters;

    uint256 private give_amount = 1000 * (10 ** 18);

    constructor(address _parametersAddress) public {
        require(_parametersAddress != address(0));
        parameters = IParameterSource(_parametersAddress);
    }

    function give() public returns (bool) {
        require(msg.sender != address(this));

        ERC20 token = ERC20(parameters.getAddress("CORE", "TOKEN"));
        token.transfer(msg.sender, give_amount);

        return true;
    }
}
