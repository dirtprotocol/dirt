pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "../interfaces/IParameterSource.sol";
import "../interfaces/IVoteController.sol";
import "../interfaces/IVoteOrigin.sol";
import "../util/TokenPot.sol";
import "./Polling.sol";
import "./VotePayout.sol";

import "../util/DebugEvents.sol";

/**
 * @title BaseVoteController
 * @author DIRT Protocol
 * @notice The methods relating to governing overall progression on the
 * state of the vote, as well as the payouts.
 */
contract BaseVoteController is Ownable, IVoteController, DebugEvents {
    using SafeMath for uint256;
    using Polling for Polling.Data;
    using TokenPot for TokenPot.Data;

    Polling.Data internal pollData;
    TokenPot.Data internal tokenPot;

    constructor(address _parameterSource, address _slushAddress)
        public
    {
        address tokenAddress = IParameterSource(_parameterSource).getAddress("CORE", "TOKEN");
        ERC20 tokenContract = ERC20(tokenAddress);

        address slushAddress = IParameterSource(_parameterSource).getAddress("CORE", "SLUSH");

        tokenPot.initialize(tokenContract, slushAddress);
    }

    // External functions

    // External functions that are view

    // External functions that are pure

    // Public functions

    /**
     * @notice After a registry item is challenged, the vote controller needs to
     * begin the vote, so people can stake their votes on a candidate.
     */
    function beginVote(IVoteController.VoteDescriptor memory _descriptor)
        public
        returns (bool _success, uint _id)
    {
        /* Checks */
        //@dev since anyone can call beginVote, we can't trust what's in _descriptor
        require(_descriptor.configuration.challengePenalty <= 100);
        require(_descriptor.configuration.votePenalty <= 100);
        require(_descriptor.configuration.votePenalty > 0);
        require(_descriptor.configuration.challengeDistribution <= 100);
        require(_descriptor.configuration.challengeLength >= 1 days);
        require(_descriptor.configuration.challengeLength < 2 days);
        require(tokenPot._unattributedTokenValue() > 0);

        IVoteOrigin origin = IVoteOrigin(msg.sender);

        // Check if a vote is pending
        require(origin.isVotePending(_descriptor.key));

        /* Effects */

        // Create a vote id
        uint pollId = pollData.createPoll(_descriptor);
        uint totalStaked = _descriptor.incumbent.stake.add(_descriptor.challenger.stake);
        require(tokenPot.attributeUnownedToPot(pollId, totalStaked), "BVC:bV:attrUnownedToPot()");

        /* Interactions */
        emit PollStarted(pollId, _descriptor.challenger.owner);

        return (true, pollId);
    }

    /**
     * @title Resolve the poll. Once voting period is over, someone needs to
     * call resolve, to start the claims process.
     * @params _pollId id of poll
     * @dev VoteControllers should have voting methods
     * that fill out the Polling.Data structure.
     * @dev Override this if the concrete vote controller needs to add more guards
     *
     * TODO make this an external function
     */
    function resolve(uint _pollId)
        public
    {

        /* Checks */
        require(pollExists(_pollId), "Poll should exist");
        require(!pollResolved(_pollId), "Poll should not be resolved");

        Polling.Poll storage poll = pollData._getPoll(_pollId);

        // @dev Normally, we shouldn't rely on timestamp since miners can fake
        // the timestamp. In our case, it's not a real issue, since miners can
        // only change timestamp by about 30 secs
        //
        // TODO: change to use _active()
        require(block.timestamp >= poll.expirationTimestamp, "Vote period needs to elapse to resolve");

        require(poll.origin != address(0), "Vote has valid origin address");
        IVoteOrigin origin = IVoteOrigin(poll.origin);

        /* Effects */

        // Vote is due to close, determine winners and losers.
        pollData._assignWinner(_pollId);

        /* Interactions */
        Polling.Candidate storage winner = pollData._resolvedCandidate(_pollId, IVoteController.StakeHolder.Winner);

        // send winner's owner stake back over to the registry contract
        require(tokenPot.withdrawTo(_pollId, poll.origin, winner.ownerStakeValue));

        // ask registry contract to assign the outcome to winner
        require(origin.assignVoteOutcome(_pollId, poll.key, winner.owner, winner.value, winner.ownerStakeValue), "BVC:r:aO");

        emit PollEnded(_pollId, poll.winner);
    }


    /**
     * @notice A user calls this as msg.sender to claim their payout. Once a
     * poll is resolved, every participant of the poll
     * would need to call this method to claim their payout.
     *
     * @dev Override this if the concrete vote controller needs to add more guards
     *
     * TODO make this an external function
     */
    function claimPayout(uint _pollId)
        public
        returns (uint _payout)
    {
        /* Checks */
        require(pollExists(_pollId), "Poll must exist");
        require(!pollActive(_pollId), "Poll must not be active");
        require(pollResolved(_pollId), "Poll must be resovled");
        require(!pollPayoutTimeEnded(_pollId), "BVC:cP:!payoutExpired");
        require(pollData._isStakeHolder(_pollId, msg.sender), "Caller was not a stake holder");

        /* Effects */

        uint payout = getPayoutAmount(_pollId);

        /* Interactions */

        //@dev _withdrawTo protects from double withdraw
        require(tokenPot.withdrawTo(_pollId, msg.sender, payout), "BVC:cP:_withdrawTo()");

        emit PollClaimedPayout(_pollId, msg.sender, payout);

        return payout;
    }

    /**
     * @notice After a certain amount of time, not everybody may have claimed their vote.
     * We want to be able to clear out the poll, and move all unclaimed votes
     * into an overflow fund.
     *
     * TODO make this an external function
     */
    function close(uint _pollId)
        public
        returns (bool _success)
    {
        /* Checks */
        require(pollExists(_pollId));
        require(!pollActive(_pollId));
        require(pollResolved(_pollId));
        require(pollPayoutTimeEnded(_pollId));

        /* Effects */
        // Effects are taken care of inside of TokenPot's withdrawTo

        /* Interactions */
        require(tokenPot.withdrawTo(_pollId, tokenPot.slushAddress, tokenPot.potAmount(_pollId)), "TVC:c:_withdrawTo()");

        // QUESTION do we need to do anything to explicitly close the poll?

        emit PollClosed(_pollId);

        return false;
    }

    /**
     * @notice Owner only: Force expiration of the vote.
     */
    function forceExpireActiveState(uint _pollId) onlyOwner external returns (bool) {
        return pollData._forceExpire(_pollId);
    }

    /**
     * @notice Owner only: Force expiration of the payout period.
     */
    function forceExpirePayoutState(uint _pollId) onlyOwner external returns (bool) {
        return pollData._forceExpirePayoutState(_pollId);
    }

    // Public functions that are view

    function pollExists(uint _pollId) public view returns (bool) {
        return pollData._exists(_pollId);
    }

    function pollActive(uint _pollId) public view returns (bool) {
        return pollData._active(_pollId);
    }

    function pollResolved(uint _pollId) public view returns (bool) {
        return pollData._resolved(_pollId);
    }

    function pollPayoutTimeEnded(uint _pollId) public view returns (bool) {
        return pollData._payoutTimeEnded(_pollId);
    }

    function hasVoted(uint _pollId) public view returns (bool) {
        return pollData._addressHasVoted(_pollId, msg.sender);
    }

    function potAmount(uint _pollId) external view returns (uint256)  {
        return tokenPot.potAmount(_pollId);
    }

    function getStatus(uint _pollId)
        public
        view
        returns (uint, address, address, string memory, string memory, uint256, uint256)
    {
        Polling.Poll storage poll = pollData._getPoll(_pollId);

        return (
            poll.expirationTimestamp,
            poll.incumbent.owner,
            poll.challenger.owner,
            poll.incumbent.value,
            poll.challenger.value,
            poll.incumbent.totalVoteValue,
            poll.challenger.totalVoteValue
        );
    }

    function getConfig(uint _pollId)
        public
        view
        returns (uint, uint, uint, uint, uint256, uint256)
    {
        Polling.Poll storage poll = pollData._getPoll(_pollId);
        IVoteController.VoteConfiguration storage config = poll.configuration;

        return (
            config.challengePenalty,
            config.votePenalty,
            config.challengeLength,
            config.challengeDistribution,
            config.minVoteStake,
            config.minVoteIncrementalStake
        );
    }

    function getPayoutAmount(uint _pollId) public view returns (uint) {

        /* Checks */
        require(pollExists(_pollId), "Poll must exist");
        require(pollData._isStakeHolder(_pollId, msg.sender), "Caller was not a stake holder");

        // We sum up the payouts for all different roles
        uint payout = 0;

        // payout for winning candidate
        if (pollData._isStakeHolder(_pollId, msg.sender, IVoteController.StakeHolder.Winner)) {
            payout = payout.add(VotePayout._winnerPayout(pollData, _pollId));
        }

        // payout for majority voter
        if (pollData._isStakeHolder(_pollId, msg.sender, IVoteController.StakeHolder.MajorityVoter)) {
            payout = payout.add(VotePayout._majorityVoterPayout(pollData, _pollId));
        }

        // payout for losing candidate
        if (pollData._isStakeHolder(_pollId, msg.sender, IVoteController.StakeHolder.Loser)) {
            payout = payout.add(VotePayout._loserPayout(pollData, _pollId));
        }

        // payout for minority voter
        if (pollData._isStakeHolder(_pollId, msg.sender, IVoteController.StakeHolder.MinorityVoter)) {
            payout = payout.add(VotePayout._minorityVoterPayout(pollData, _pollId));
        }

        return payout;
    }

    // Public functions that are pure

    // Internal functions

    // Private functions

}
