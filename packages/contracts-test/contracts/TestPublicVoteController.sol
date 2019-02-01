pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../node_modules/@dirt/contracts/contracts/voting/PublicVoteController.sol";
import "../node_modules/@dirt/contracts/contracts/interfaces/IVoteController.sol";
import "./TestIVoteController.sol";

contract TestPublicVoteController is PublicVoteController, TestIVoteController {

    // list of addresses to clear
    mapping(uint256 => address[]) internal users;
    uint256[] internal pollIds;

    constructor(address _parameters, address _slushAddress)
        public
        PublicVoteController(_parameters, _slushAddress) {
    }

    // TODO a copy of what's in TestTokenPot. Should have common test helpers
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
                delete tokenPot.pots[pollId].amountClaimed[user];
            }

            delete tokenPot.pots[pollId].totalAmount;
        }

        // clear bookkeeping attributes in test harness
        for (pi = 0; pi < pollIds.length; pi++) {
            pollId = pollIds[pi];

            for (ui = 0; ui < users[pollId].length; ui++) {
                delete users[pollId][ui];
            }
            users[pollId].length = 0;
            delete pollIds[pi];
        }
        pollIds.length = 0;

        tokenPot.totalDepositedValue = 0;
    }

    function testOnlyRecordUserVoted(uint _pollId, address _address) public returns (bool) {
        users[_pollId].push(_address);
    }

    // TODO rename to forceExpireActiveState
    function forceExpire(uint _pollId) public returns (bool _success) {
        return pollData._forceExpire(_pollId);
    }

    function forcePayoutExpiredState(uint _pollId) public returns (bool) {
        return pollData._forceExpirePayoutState(_pollId);
    }

    function getWinner(uint _pollId) public view returns (IVoteController.Candidate) {
        return pollData.polls[_pollId].winner;
    }

    function getPotAmount(uint _pollId) public view returns (uint) {
        return tokenPot.pots[_pollId].totalAmount;
    }

}