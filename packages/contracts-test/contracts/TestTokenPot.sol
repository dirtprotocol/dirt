pragma solidity ^0.5.0;

import "../node_modules/@dirt/contracts/contracts/util/TokenPot.sol";

contract TestTokenPot {
    using TokenPot for TokenPot.Data;

    TokenPot.Data internal tokenPot;

    // list of addresses to clear
    mapping(uint256 => address[]) internal users;
    uint256[] internal pollIds;

    constructor(ERC20 _tokenContract, address slushAddress) public {
        tokenPot.initialize(_tokenContract, slushAddress);
    }

    event Debug(string msg, uint value, address addr);

    function resetTokenPot() public returns (bool) {
        uint pollId;
        address user;
        uint256 pi;
        uint256 ui;

        // clear class attributes
        for (pi = 0; pi < pollIds.length; pi++) {
            pollId = pollIds[pi];

            for (ui = 0; ui < users[pollId].length; ui++) {
                user = users[pollId][ui];
                emit Debug("poll : user", pollId, user);
                delete tokenPot.pots[pollId].amountClaimed[user];
            }

            delete tokenPot.pots[pollId].totalAmount;
        }

        // clear bookkeeping attributes in test harness
        for (pi = 0; pi < pollIds.length; pi++) {
            pollId = pollIds[pi];

            for (ui = 0; ui < users[pollId].length; ui++) {
                emit Debug("2: poll : user", pollId, user);
                delete users[pollId][ui];
            }
            users[pollId].length = 0;
            delete pollIds[pi];
        }
        pollIds.length = 0;

        tokenPot.totalDepositedValue = 0;
    }

    function attributeUnownedToPot(uint _pollId, uint _value) public returns (bool) {
        if (users[_pollId].length == 0) {
            pollIds.push(_pollId);
        }
        return tokenPot.attributeUnownedToPot(_pollId, _value);
    }

    function depositHere(uint _pollId, uint _value) public returns (bool) {
        if (users[_pollId].length == 0) {
            pollIds.push(_pollId);
        }
        return tokenPot.depositHere(_pollId, _value, msg.sender);
    }

    function withdrawTo(uint _pollId, address _address, uint _value) public returns (bool) {
        if (users[_pollId].length == 0) {
            pollIds.push(_pollId);
        }
        users[_pollId].push(_address);
        return tokenPot.withdrawTo(_pollId, _address, _value);
    }

    function getPotAmount(uint _pollId) public view returns (uint) {
        return tokenPot.potAmount(_pollId);
    }

    function getClaimedAmount(uint _pollId, address _address) public view returns (uint) {
        return tokenPot.pots[_pollId].amountClaimed[_address];
    }

}
