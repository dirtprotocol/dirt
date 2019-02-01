pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

// TODO: When interfaces support struct / enum definitions change
// this to `interface` over `contract`
contract IVoteController {

    event PollStarted(uint indexed pollId, address indexed challenger);
    event VoteCast(uint indexed pollId, address indexed voter, uint256 stake);
    event VoteIncreased(uint indexed pollId, address indexed voter, uint256 increasedBy);
    event PollEnded(uint indexed pollId, IVoteController.Candidate winner);
    event PollClaimedPayout(uint indexed pollId, address indexed voter, uint256 amount);
    event PollClosed(uint indexed pollId);

    // NOTE if add other enums, need to rewrite isStakeHolder()
    // NOTE if change order here, need to change order in TestPolling
    enum Candidate {
        None,
        Incumbent,
        Challenger
    }

    enum StakeHolder {
        Winner,
        Loser,
        MajorityVoter,
        MinorityVoter
    }

    struct VoteConfiguration  {
        string style;

        /**
         *@notice the percentage lost by the challenger if they lose the vote.
         */
        uint challengePenalty;

        /**
         *@notice the percentage lost by a minority voter.
         */
        uint votePenalty;

        // TODO rename challengeLength to challengeInterval
        uint challengeLength;

        /**
         *@notice the percentage of the loser pot that gets distributed between
         * the winners and the majority voters.
         */
        uint challengeDistribution;
        uint256 minVoteStake;
        uint256 minVoteIncrementalStake;
    }

    struct VoteCandidateDescriptor {
        address owner;
        string value;
        uint256 stake;
    }

    struct VoteDescriptor {
        string key;

        VoteCandidateDescriptor incumbent;
        VoteCandidateDescriptor challenger;

        VoteConfiguration configuration;
    }

    // External methods

    // Public methods
    function beginVote(VoteDescriptor memory _voteDescriptor) public returns (bool _success, uint _voteId);

    // Public view methods
    function pollExists(uint _pollId) public view returns (bool);
    function pollActive(uint _pollId) public view returns (bool);
    function potAmount(uint _pollId) external view returns (uint256);

    // Public pure methods
    function getStyleName() public pure returns (string memory _style);

}
