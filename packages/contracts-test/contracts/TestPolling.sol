pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../node_modules/@dirt/contracts/contracts/voting/Polling.sol";
import "../node_modules/@dirt/contracts/contracts/interfaces/IVoteController.sol";

contract TestPolling {
    using Polling for Polling.Data;

    // NOTE would make it easier on testing if web3 abi could return
    // structs. But since it can't, we have no choice but to write
    // test helper access functions
    Polling.Data internal pollData;

    // Test action functions

    function createPoll(address incumbentAcct, address challengerAcct)
        public
        returns (uint _pollId)
    {
        IVoteController.VoteConfiguration memory config =
            IVoteController.VoteConfiguration({
                style: "PUBLIC",
                challengePenalty: 20,
                challengeDistribution: 20,
                votePenalty: 20,
                challengeLength: 2 hours,
                minVoteStake: 1,
                minVoteIncrementalStake: 1
            });

        IVoteController.VoteCandidateDescriptor memory incumbent =
            IVoteController.VoteCandidateDescriptor({
                owner: incumbentAcct,
                value: "Incumbent Value",
                stake: 100
            });

        IVoteController.VoteCandidateDescriptor memory challenger =
            IVoteController.VoteCandidateDescriptor({
                owner: challengerAcct,
                value: "Challenger Value",
                stake: 101
            });

        IVoteController.VoteDescriptor memory descriptor =
            IVoteController.VoteDescriptor({
                key: "Key of Data",
                incumbent: incumbent,
                challenger: challenger,
                configuration: config
            });

        return pollData.createPoll(descriptor);
    }

    function pushVote(
        uint _pollId,
        IVoteController.Candidate _candidate,
        uint _stake
    )
        public
        returns (bool _success)
    {
        return pollData.pushVote(_pollId, _candidate, _stake, msg.sender);
    }

    function increaseVote(uint _pollId, uint256 _additionalStake)
        public
        returns (bool _success)
    {
        return pollData.increaseVote(_pollId, _additionalStake);
    }

    function forceExpire(uint _pollId)
        public
        returns (bool _success)
    {
        return pollData._forceExpire(_pollId);
    }

    function assignWinner(uint _pollId)
        public
        returns (bool _success)
    {
        return pollData._assignWinner(_pollId);
    }

    // Test helper functions


    // Test helper view functions.
    // You can't actually access public structs. So we have to make
    // helper methods to access the values.
    // https://ethereum.stackexchange.com/questions/12668/web3j-callback-to-retreive-public-struct

    function pollData_numPolls() public view returns (uint) {
        return pollData.numPolls;
    }

    // returns only the non-complex values of a poll
    function pollData_polls(uint _pollId)
        public
        view
        returns (
            uint expirationTimestamp,
            IVoteController.Candidate winner,
            address origin,
            string memory key
        )
    {
        Polling.Poll storage poll = pollData._getPoll(_pollId);

        return (
            poll.expirationTimestamp,
            poll.winner,
            poll.origin,
            poll.key
        );
    }

    function pollData_allVoters_at(uint _pollId, address _voter)
        public
        view
        returns (IVoteController.Candidate)
    {
        Polling.Poll storage poll = pollData._getPoll(_pollId);

        return poll.allVoters[_voter];
    }

    function pollData_polls_candidate(
        uint _pollId,
        IVoteController.Candidate _candidateType
    )
        public
        view
        returns (
            address owner,
            uint ownerStakeValue,
            uint voteValue,
            uint totalVoteValue,
            string memory value
        )
    {
        Polling.Poll storage poll = pollData._getPoll(_pollId);

        Polling.Candidate storage candidate = poll.incumbent;
        if (_candidateType == IVoteController.Candidate.Incumbent) {
            candidate = poll.incumbent;
        } else if (_candidateType == IVoteController.Candidate.Challenger) {
            candidate = poll.challenger;
        } else {
            revert("TestPolling: should not happen");
        }

        return (
            candidate.owner,
            candidate.ownerStakeValue,
            candidate.voteValue,
            candidate.totalVoteValue,
            candidate.value
        );
    }

    function pollData_polls_candidate_voteValues(
        uint _pollId,
        IVoteController.Candidate _candidateType,
        address _voter
    )
        public
        view
        returns (uint256)
    {
        Polling.Poll storage poll = pollData._getPoll(_pollId);

        Polling.Candidate storage candidate = poll.incumbent;
        if (_candidateType == IVoteController.Candidate.Incumbent) {
            candidate = poll.incumbent;
        } else if (_candidateType == IVoteController.Candidate.Challenger) {
            candidate = poll.challenger;
        }

        return candidate.voteValues[_voter];
    }
}
