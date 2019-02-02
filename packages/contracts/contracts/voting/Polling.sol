pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../interfaces/IVoteController.sol";

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title Polling
 * @author DIRT protocol
 * @notice The mechanism for keeping track of who voted for what and what
 * candidates there are are kept here. VoteControllers use this to keep track of Polls
 */
library Polling {
    using SafeMath for uint256;


    struct Candidate {
        // The address the incumbent or challenger candidate
        address owner;

        // How much the candidate staked
        uint256 ownerStakeValue;

        // Value of just the voters
        uint256 voteValue;

        // OwnerStakeValue + VoteValue
        uint256 totalVoteValue;

        // TODO make iterable map a library?
        // Iterable map of votes and their values
        mapping(address => uint256) voteValues;
        address[] voters;

        string value;
    }

    struct Poll {
        // Timestamp of when an active poll expires
        // TODO rename to activeExpirationAt
        uint expirationTimestamp;

        // Timestamp of when a resolved poll expires
        // TODO rename to payoutExpirationAt
        uint payoutExpirationTimestamp;

        IVoteController.Candidate winner;

        Candidate incumbent;
        Candidate challenger;

        // the address of the registry that initiated the vote.
        // TODO rename to originRegistry
        address origin;

        // the key of the registry item we're polling for
        string key;

        // configuration for the type of vote
        IVoteController.VoteConfiguration configuration;

        // TODO: This is not ideal , but we need to know how votes split on each side for
        // allowing increasing of voted value
        mapping(address => IVoteController.Candidate) allVoters;
    }

    struct Data {
        uint numPolls;
        mapping(uint => Poll) polls;
    }

    // External functions
    // External functions that are view
    // External functions that are pure

    // Public functions

    function createPoll(
        Data storage self,
        IVoteController.VoteDescriptor memory _descriptor
    )
        public
        returns (uint _pollId)
    {

        uint interval = _descriptor.configuration.challengeLength;
        uint pollId = self.numPolls + 1;
        self.numPolls = pollId;

        /* Checks */
        require(interval >= 1 hours);

        /* Effects */
        self.polls[pollId].expirationTimestamp = block.timestamp.add(interval);
        self.polls[pollId].payoutExpirationTimestamp = block.timestamp.add(interval.mul(2));
        self.polls[pollId].origin = msg.sender;
        self.polls[pollId].key = _descriptor.key;
        self.polls[pollId].configuration = _descriptor.configuration;

        // Copy descriptor properties into vote map
        __copyCandidateValues(self.polls[pollId].incumbent, _descriptor.incumbent);
        __copyCandidateValues(self.polls[pollId].challenger, _descriptor.challenger);

        /* Interactions */

        return pollId;
    }

    // TODO: Only the vote controller should be able to call this function.
    function pushVote(
        Data storage self,
        uint _pollId,
        IVoteController.Candidate _candidateType,
        uint256 _stake,
        address _from
    )
        public
        returns (bool _success)
    {
        // TODO check that the vote is active?
        Poll storage poll = _getPoll(self, _pollId);

        require(_stake >= poll.configuration.minVoteStake, "Vote stake must be greater than or equal to minimum voting stake.");
        require(_candidateType != IVoteController.Candidate.None, "Voting candidate must be valid.");
        require(!_addressHasVoted(self, _pollId, _from), "Sender must not already have voted.");

        Candidate storage candidate = getCandidate(self, _pollId, _candidateType);

        candidate.voteValues[_from] = _stake;
        candidate.voters.push(_from);
        candidate.totalVoteValue = candidate.totalVoteValue.add(_stake);
        candidate.voteValue = candidate.voteValue.add(_stake);

        poll.allVoters[_from] = _candidateType;

        return true;
    }

    function increaseVote(
        Data storage self,
        uint _pollId,
        uint256 _additionalStake
    )
        public
        returns (bool _success)
    {
        // TODO check that the vote is active?

        require(_addressHasVoted(self, _pollId, msg.sender), "Sender required to have previously voted to increate stake.");

        Poll storage poll = _getPoll(self, _pollId);

        require(_additionalStake >= poll.configuration.minVoteIncrementalStake, "Additional voting stake must be greather than or equal to the minimum incremental voting stake.");


        // Find the candidate for the voter
        IVoteController.Candidate votedForCandidate = poll.allVoters[msg.sender];

        assert(votedForCandidate != IVoteController.Candidate.None);

        Candidate storage candidate = getCandidate(self, _pollId, votedForCandidate);

        // Increase the vote value by the additional stake
        candidate.voteValues[msg.sender] = candidate.voteValues[msg.sender].add(_additionalStake);
        candidate.totalVoteValue = candidate.totalVoteValue.add(_additionalStake);
        candidate.voteValue = candidate.voteValue.add(_additionalStake);

        return true;
    }

    function getICandidate(
      Data storage self,
      uint _pollId
    )
        public
        view
        returns (IVoteController.Candidate)
    {
        Poll storage poll = _getPoll(self, _pollId);
        return poll.allVoters[msg.sender];
    }

    /**
     * @notice only called in testing
     * @dev this is an internal method that should never be called in any public
     * or external function unless it's part of a test harness
     *TODO rename to forceExpireActiveState
     */
    function _forceExpire(Data storage self, uint _pollId)
        public
        returns (bool _success)
    {
        /* Checks */

        Poll storage poll = _getPoll(self, _pollId);

        require(_exists(self, _pollId));
        // require(msg.sender == poll.origin);

        /* Effects */

        poll.expirationTimestamp = block.timestamp - 1;

        /* Interactions */

        return true;
    }

    /**
     * @notice only called in testing
     * @dev this is an internal method that should never be called in any public
     * or external function unless it's part of a test harness
     */
    function _forceExpirePayoutState(Data storage self, uint _pollId)
        public
        returns (bool)
    {
        /* Checks */

        Poll storage poll = _getPoll(self, _pollId);

        /* Effects */

        poll.payoutExpirationTimestamp = block.timestamp - 1;

        /* Interactions */

        return true;
    }

    function _assignWinner(Data storage self, uint _pollId)
        public
        returns (bool _success)
    {
        /* Checks */

        Poll storage poll = _getPoll(self, _pollId);

        require(block.timestamp >= poll.expirationTimestamp, "Vote period needs to elapse to resolve");

        /* Effects */

        if (poll.challenger.totalVoteValue > poll.incumbent.totalVoteValue) {
            poll.winner = IVoteController.Candidate.Challenger;
        } else {
            poll.winner = IVoteController.Candidate.Incumbent;
        }

        /* Interactions */

        return true;
    }

    // Public functions that are view

    function getCandidate(
        Data storage self,
        uint _pollId,
        IVoteController.Candidate _candidate
    )
        public
        view
        returns (Candidate storage _result)
    {
        require(_candidate != IVoteController.Candidate.None);

        Poll storage poll = _getPoll(self, _pollId);
        Candidate storage voteCandidate = poll.incumbent;

        if(_candidate == IVoteController.Candidate.Challenger) {
            voteCandidate = poll.challenger;
        }

        return voteCandidate;
    }

    function _exists(Data storage self, uint _pollId)
        public
        view
        returns (bool)
    {
        Poll storage poll = _getPoll(self, _pollId);
        return poll.expirationTimestamp > 0;
    }

    function _active(Data storage self, uint _pollId)
        public
        view
        returns (bool)
    {
        Poll storage poll = _getPoll(self, _pollId);
        return poll.expirationTimestamp != 0
            && block.timestamp < poll.expirationTimestamp;
    }

    function _resolved(Data storage self, uint _pollId)
        public
        view
        returns (bool)
    {
        Poll storage poll = _getPoll(self, _pollId);
        return poll.winner != IVoteController.Candidate.None
            && block.timestamp >= poll.expirationTimestamp;
    }

    function _payoutTimeEnded(Data storage self, uint _pollId)
        public
        view
        returns (bool)
    {
        Poll storage poll = _getPoll(self, _pollId);
        return _resolved(self, _pollId)
            && block.timestamp >= poll.payoutExpirationTimestamp;
    }

    //@dev TODO rename to hasVoted
    function _addressHasVoted(Data storage self, uint _pollId, address _voter)
        public
        view
        returns (bool)
    {
        Poll storage poll = _getPoll(self, _pollId);
        return poll.allVoters[_voter] != IVoteController.Candidate.None;
    }

    function _resolvedCandidate(
        Data storage self,
        uint _pollId,
        IVoteController.StakeHolder stakeHolder
    )
        public
        view
        returns (Candidate storage _candidate)
    {
        Poll storage poll = _getPoll(self, _pollId);

        if (stakeHolder == IVoteController.StakeHolder.Winner) {
            if (poll.winner == IVoteController.Candidate.Incumbent) {
                return poll.incumbent;
            } else if (poll.winner == IVoteController.Candidate.Challenger) {
                return poll.challenger;
            } else {
                revert("Invalid candidate enum");
            }
        } else if (stakeHolder == IVoteController.StakeHolder.Loser) {
            if (poll.winner == IVoteController.Candidate.Incumbent) {
                return poll.challenger;
            } else if (poll.winner == IVoteController.Candidate.Challenger) {
                return poll.incumbent;
            } else {
                revert("Invalid candidate enum");
            }
        } else {
            revert("Invalid stakeholder enum");
        }
    }

    function _isStakeHolder(
        Data storage self,
        uint _pollId,
        address _voter
    )
        public
        view
        returns (bool)
    {
        Poll storage poll = _getPoll(self, _pollId);

        return poll.incumbent.owner == _voter
            || poll.challenger.owner == _voter
            || poll.allVoters[_voter] != IVoteController.Candidate.None;
    }

    function _isStakeHolder(
        Data storage self,
        uint _pollId,
        address _voter,
        IVoteController.StakeHolder _stakeholder
    )
        public
        view
        returns (bool)
    {
        Poll storage poll = _getPoll(self, _pollId);

        Polling.Candidate storage winner =
            _resolvedCandidate(self, _pollId, IVoteController.StakeHolder.Winner);
        Polling.Candidate storage loser =
            _resolvedCandidate(self, _pollId, IVoteController.StakeHolder.Loser);

        if (_stakeholder == IVoteController.StakeHolder.Winner) {

            return winner.owner == _voter;

        } else if (_stakeholder == IVoteController.StakeHolder.MajorityVoter) {

            return poll.allVoters[_voter] == poll.winner
                && winner.voteValues[_voter] > 0;

        } else if (_stakeholder == IVoteController.StakeHolder.Loser) {

            return loser.owner == _voter;

        } else if (_stakeholder == IVoteController.StakeHolder.MinorityVoter) {

            return poll.allVoters[_voter] != poll.winner
                && poll.allVoters[_voter] != IVoteController.Candidate.None
                && loser.voteValues[_voter] > 0;

        }

        return false;
    }

    // Internal functions that are view

    /**
     * @dev This is not public because you can only return structs in internal
     * methods. Since the code is not huge, it won't bloat the client contract.
     * http://solidity.readthedocs.io/en/develop/frequently-asked-questions.html#can-a-contract-function-return-a-struct
     */
    function _getPoll(Data storage self, uint _pollId)
        internal
        view
        returns (Poll storage item)
    {
        return self.polls[_pollId];
    }


    // Internal functions

    // Private functions

    function __copyCandidateValues(
        Candidate storage _candidate,
        IVoteController.VoteCandidateDescriptor memory _descriptor
    )
        private
        returns (bool _success)
    {
        _candidate.owner = _descriptor.owner;
        _candidate.value = _descriptor.value;
        _candidate.ownerStakeValue = _descriptor.stake;
        _candidate.totalVoteValue = _descriptor.stake;
        return true;
    }
}
