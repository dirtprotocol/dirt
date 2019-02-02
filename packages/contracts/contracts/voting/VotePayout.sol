pragma solidity ^0.5.0;

import "../interfaces/IVoteController.sol";

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Polling.sol";

/**
 * @title VotePayout
 * @author DIRT protocol
 * @notice calculates the amount that each stake holder should get.
 * The four different stakeholders are the Winner, Loser, Majority Voter, and
 * Minority Voter. The winner can be either the incumbent or challenger candidate.
 * The majority voter voted the winning side. The minority voter voted with
 * the losing side.
 *
 * The payout is determined by three different variables in
 * IVoteController::VoteConfiguration in every VoteController.
 * - challengePenalty
 * - votePenalty
 * - challengeDistribution
 *
 * See definitions in IVoteController
 *
 * TODO some calculations like loserPot and resolving winners can probably
 * be passed in to save on computation and gas?
 */
library VotePayout {
    using SafeMath for uint256;
    using Polling for Polling.Data;

    function fracMul(uint256 _value, uint _numerator, uint _denom)
        public
        pure
        returns (uint256 _result)
    {
        if(_numerator == 0) {
            return 0;
        } else if (_numerator == _denom)  {
            return _value;
        }

        return _value.mul(_numerator).div(_denom);
    }

    // Internal view functions

    /**
     * @notice helper function. calculates the entire loser pot to distribute
     * among the winners
     */
    function _loserPot(Polling.Data storage pollData, uint _pollId)
        public
        view
        returns (uint)
    {
        Polling.Poll storage poll = pollData._getPoll(_pollId);
        IVoteController.VoteConfiguration storage config = poll.configuration;
        Polling.Candidate storage loser =
            pollData._resolvedCandidate(_pollId, IVoteController.StakeHolder.Loser);

        assert(config.challengePenalty <= 100);
        assert(config.votePenalty <= 100);

        /**
         * @dev we multiplied and added, and only divided once at the end, because
         * div rounds down. So here we round down once, instead of using fracMul
         * and doing it twice. What we gain in accuracy, we lose in room in case
         * the multiplication and addition overflow. But givee it's only two
         * decimal places of room out of 2^256, we op for accuracy.
         */

        // Loser amount = Stake[loser] * ChallengePenalty%
        uint loserAmt = loser.ownerStakeValue.mul(config.challengePenalty);

        // Minority Voter amount = Sum(Stake[minority][i]) * VotePenalty%
        uint minorityVotersAmt = loser.voteValue.mul(config.votePenalty);

        return loserAmt.add(minorityVotersAmt).div(100);
    }

    /**
     * @notice helper function. Calculate the amount all the winners staked.
     */
    function _totalWinningAmt(Polling.Data storage pollData, uint _pollId)
        public
        view
        returns (uint)
    {

        Polling.Candidate storage winner =
            pollData._resolvedCandidate(_pollId, IVoteController.StakeHolder.Winner);

        return winner.totalVoteValue;
    }

    function _winnerPayout(Polling.Data storage pollData, uint _pollId)
        public
        view
        returns (uint)
    {
        /* Checks */
        // check that configuration values are valid

        Polling.Poll storage poll = pollData._getPoll(_pollId);
        Polling.Candidate storage winner =
            pollData._resolvedCandidate(_pollId, IVoteController.StakeHolder.Winner);

        assert(poll.configuration.challengeDistribution <= 100);

        uint loserPot = _loserPot(pollData, _pollId);
        uint totalWinningAmt = _totalWinningAmt(pollData, _pollId);
        uint winnerStake = winner.ownerStakeValue;

        /**
         * @dev while we have more accuracy with one division at the end, we
         * have a greater chance of overflowing with a couple multiplications
         * and additions in a row
         */
        uint winnerStakeGain = totalWinningAmt
            .mul(loserPot)
            .mul(poll.configuration.challengeDistribution);

        uint winnerVoteGain = winnerStake
            .mul(loserPot)
            .mul(SafeMath.sub(100, poll.configuration.challengeDistribution));

        /**
         * @dev Note that the original winner stake isn't paid out. It's
         * transferred to the registry. Hence, it's not added to the payout,
         * unlike the payout for majority voters
         */
        uint payout = winnerStakeGain.add(winnerVoteGain)
            .div(totalWinningAmt.mul(100));

        return payout;
    }

    function _majorityVoterPayout(Polling.Data storage pollData, uint _pollId)
        public
        view
        returns (uint)
    {
        Polling.Poll storage poll = pollData._getPoll(_pollId);

        Polling.Candidate storage winner =
            pollData._resolvedCandidate(_pollId, IVoteController.StakeHolder.Winner);

        assert(poll.configuration.challengeDistribution <= 100);

        uint loserPot = _loserPot(pollData, _pollId);
        uint totalWinningAmt = _totalWinningAmt(pollData, _pollId);
        uint majorityStake = winner.voteValues[msg.sender];

        uint majorityGain = loserPot
            .mul(SafeMath.sub(100, poll.configuration.challengeDistribution))
            .mul(majorityStake)
            .div(totalWinningAmt.mul(100));

        return majorityStake.add(majorityGain);
    }

    function _loserPayout(Polling.Data storage pollData, uint _pollId)
        public
        view
        returns (uint)
    {
        Polling.Poll storage poll = pollData._getPoll(_pollId);

        Polling.Candidate storage loser =
            pollData._resolvedCandidate(_pollId, IVoteController.StakeHolder.Loser);

        assert(poll.configuration.challengePenalty <= 100);

        /* @dev we make sure to divide at the very end, because fracMul
         *rounds down. Originally, we did:
         *
         *   LoserPayout = LoserStake - LoserStake * (ChallengePenalty / 100)
         *
         * This is a bug since fracMult rounds down, and subtracting a
         * rounded down number rounds up. Given there can be lots of losers,
         * this can result in insufficient funds.
         *
         * The fix is that we leave division until the very end. We now do:
         *
         *   LoserPayout = LoserStake * (100 - ChallengePenalty) / 100
         *
         */
        return fracMul(
            loser.ownerStakeValue,
            SafeMath.sub(100, poll.configuration.challengePenalty),
            100
        );
    }

    function _minorityVoterPayout(Polling.Data storage pollData, uint _pollId)
        public
        view
        returns (uint)
    {
        Polling.Poll storage poll = pollData._getPoll(_pollId);

        Polling.Candidate storage loser =
            pollData._resolvedCandidate(_pollId, IVoteController.StakeHolder.Loser);

        assert(poll.configuration.votePenalty <= 100);

        /* @dev Careful when editing this. See the explanation in _loserPayout */
        return fracMul(
            loser.voteValues[msg.sender],
            SafeMath.sub(100, poll.configuration.votePenalty),
            100
        );
    }

}
