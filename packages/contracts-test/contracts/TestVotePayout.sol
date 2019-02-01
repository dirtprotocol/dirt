pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../node_modules/@dirt/contracts/contracts/util/DebugEvents.sol";
import "../node_modules/@dirt/contracts/contracts/voting/VotePayout.sol";
import "../node_modules/@dirt/contracts/contracts/interfaces/IVoteController.sol";

contract TestVotePayout is DebugEvents {
    using Polling for Polling.Data;
    using VotePayout for Polling.Data;

    Polling.Data internal pollData;

    // test helper functions to change state of pollData

    function createPoll(
        address _incumbentAcct,
        uint _incumbentStake,
        address _challengerAcct,
        uint _challengerStake,
        uint _challengePenalty,
        uint _challengeDistribution,
        uint _votePenalty
    )
        public
        returns (uint _pollId)
    {
        IVoteController.VoteConfiguration memory config =
            IVoteController.VoteConfiguration({
                style: "PUBLIC",
                challengePenalty: _challengePenalty,
                challengeDistribution: _challengeDistribution,
                votePenalty: _votePenalty,
                challengeLength: 2 hours,
                minVoteStake: 1,
                minVoteIncrementalStake: 1
            });

        IVoteController.VoteCandidateDescriptor memory incumbent =
            IVoteController.VoteCandidateDescriptor({
                owner: _incumbentAcct,
                value: "Incumbent Value",
                stake: _incumbentStake
            });

        IVoteController.VoteCandidateDescriptor memory challenger =
            IVoteController.VoteCandidateDescriptor({
                owner: _challengerAcct,
                value: "Challenger Value",
                stake: _challengerStake
            });

        IVoteController.VoteDescriptor memory descriptor =
            IVoteController.VoteDescriptor({
                key: "Key of Data",
                incumbent: incumbent,
                challenger: challenger,
                configuration: config
            });

        uint newPollId = pollData.createPoll(descriptor);

        return newPollId;
    }

    function vote(
        uint _pollId,
        IVoteController.Candidate _candidate,
        uint _stake
    )
        public
        returns (bool _success)
    {
        return pollData.pushVote(_pollId, _candidate, _stake, msg.sender);
    }

    function forceExpire(uint _pollId) public returns (bool _success) {
        return pollData._forceExpire(_pollId);
    }

    function resolve(uint _pollId) public returns (bool _success) {
        return pollData._assignWinner(_pollId);
    }

    function loserPot(uint _pollId) public view returns (uint) {
        return pollData._loserPot(_pollId);
    }

    function totalWinningAmt(uint _pollId) public view returns (uint) {
        return pollData._totalWinningAmt(_pollId);
    }

    function winnerPayout(uint _pollId) public view returns (uint) {
        return pollData._winnerPayout(_pollId);
    }

    function majorityVoterPayout(uint _pollId) public view returns (uint) {
        return pollData._majorityVoterPayout(_pollId);
    }

    function loserPayout(uint _pollId) public view returns (uint) {
        return pollData._loserPayout(_pollId);
    }

    function minorityVoterPayout(uint _pollId) public view returns (uint) {
        return pollData._minorityVoterPayout(_pollId);
    }

    // test helper view functions

    function getPollOrigin(uint _pollId) public view returns (address) {
        return pollData.polls[_pollId].origin;
    }

}
