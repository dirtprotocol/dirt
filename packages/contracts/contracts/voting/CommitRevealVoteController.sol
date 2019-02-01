pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "./BaseVoteController.sol";
import "../interfaces/ICommitRevealVoteController.sol";

/**
 *@title CommitRevealVoteController
 *@author DIRT protocol
 *@notice a voting style where the votes are hidden. There is an extra reveal
 * stage where people reveal their votes, before a vote is resolved. This way,
 * people won't just vote for a candidate once they see that side is winning.
 */
contract CommitRevealVoteController is Ownable, BaseVoteController, ICommitRevealVoteController {

    event CRVoteRevealed(uint indexed pollId, address indexed voter);

    struct Commit {
        bytes32 hashed;
        uint256 voteStake;
    }

    struct VoteCommits {
        uint256 revealExpiration;
        uint256 totalVoteStake;
        mapping(address => Commit) addresses;
        address[] addressesArray;
    }

    mapping(uint => VoteCommits) internal commits;

    constructor(address _parameterSource, address _slushAddress)
        public
        BaseVoteController(_parameterSource, _slushAddress)
    {
        // do nothing
    }

    /**
     *@notice Only called during tests.
     *@notice Can only be called by the registry contract that initiated the vote
     */
    function forceExpireRevealState(uint _pollId) onlyOwner public returns (bool) {
        require(pollExists(_pollId), "Vote must exist");
        // require(msg.sender == pollData.polls[_pollId].origin, "Can only be expired from owning contract");
        commits[_pollId].revealExpiration = block.timestamp;
        return true;
    }

    /**
     *@notice checks whether we're able to reveal our votes.
     */
    function revealActive(uint _pollId) public view returns (bool) {
        return pollExists(_pollId) &&
            !pollActive(_pollId) &&
            commits[_pollId].revealExpiration != 0 &&
            commits[_pollId].revealExpiration > block.timestamp;
    }

    /**
     *@notice See base class
     */
    function beginVote(IVoteController.VoteDescriptor memory _descriptor) public returns (bool _success, uint _id) {
        (_success, _id) = super.beginVote(_descriptor);
        require(_success, "Base vote must be created");

        uint length = _descriptor.configuration.challengeLength.mul(2);

        commits[_id].revealExpiration = block.timestamp + length;
    }

    function getStyleName() public pure returns (string memory _style) {
        return "COMMIT_REVEAL";
    }

    /**
     *@notice votes commits their vote with a secret hash and a stake. While the stake is visible,
     * it's not visible which candidate they voted for.
     */
    function commit(uint _pollId, bytes32 _secretHash, uint256 _stake) public returns (bool) {
        Polling.Poll storage poll = pollData._getPoll(_pollId);

        /* Checks */

        require(pollExists(_pollId), "Vote must exist");
        require(pollActive(_pollId), "Vote must be active");
        require(poll.origin != address(0), "Vote has valid origin address");
        require(!_hasCommited(_pollId, msg.sender), "Sender has not previously committed");

        uint256 minStake = pollData.polls[_pollId].configuration.minVoteStake;

        require(_stake >= minStake, "Vote stake be be >= min voting stake");

        /* Effects */

        commits[_pollId].addresses[msg.sender].hashed = _secretHash;
        commits[_pollId].addresses[msg.sender].voteStake = _stake;
        commits[_pollId].totalVoteStake = commits[_pollId].totalVoteStake.add(_stake);

        /* Interactions */

        require(tokenPot.depositHere(_pollId, _stake, msg.sender), "Depositing funds must succeed");

        emit VoteCast(_pollId, msg.sender, _stake);

        return true;
    }

    /**
     *@notice increase the commitment to vote by additional amount
     */
    function increaseCommit(uint _pollId, uint256 _additionalStake) public returns (bool) {
        require(pollExists(_pollId), "Vote must exist");
        require(pollActive(_pollId), "Vote must be active");
        require(_hasCommited(_pollId, msg.sender), "Sender has previously commited");

        uint256 minIncrementalStake = pollData.polls[_pollId].configuration.minVoteIncrementalStake;

        require(_additionalStake >= minIncrementalStake, "Additional stake must be enough");
        require(tokenPot.depositHere(_pollId, _additionalStake, msg.sender), "Deposit of additional stake must succeed");

        commits[_pollId].addresses[msg.sender].voteStake = commits[_pollId].addresses[msg.sender].voteStake.add(_additionalStake);
        commits[_pollId].totalVoteStake = commits[_pollId].totalVoteStake.add(_additionalStake);

        return true;
    }

    /**
     *@notice After voting period expires, people need to reveal their votes by sending in
     * the actual candidate they voted for, and a salt help match their previous committment.
     */
    function revealVote(uint _pollId, IVoteController.Candidate _candidate, uint salt) public returns (bool) {
        require(revealActive(_pollId), "Reveal phase must be active");
        require(_hasCommited(_pollId, msg.sender), "Sender has previously commited");

        // bytes memory packed = abi.encodePacked(uint(_candidate), salt);
        bytes32 expected = keccak256(abi.encodePacked(uint(_candidate), salt));

        Commit storage commitItem = commits[_pollId].addresses[msg.sender];

        require(commitItem.hashed == expected, "Reveal result must match commit");

        commits[_pollId].totalVoteStake = commits[_pollId].totalVoteStake.sub(commitItem.voteStake);

        pollData.pushVote(_pollId, _candidate, commitItem.voteStake, msg.sender);

        emit CRVoteRevealed(_pollId, msg.sender);

        return true;
    }

    /**
     *@notice see base class
     */
    function resolve(uint _pollId) public {
        require(!revealActive(_pollId));
        return super.resolve(_pollId);
    }

    /**
     *@notice see base class
     */
    function claimPayout(uint _pollId) public returns (uint) {
        require(!revealActive(_pollId));
        return super.claimPayout(_pollId);
    }

    /**
     *@notice see base class
     *@dev what do we do with non-revealed votes?
     */
    function close(uint _pollId) public returns (bool) {

    }

    /**
     *@notice see if a user has committed
     *@dev should people be able to query any address, hence make private
     * function public?
     */
    function hasCommitted(uint _pollId) public view returns (bool) {
        return _hasCommited(_pollId, msg.sender);
    }

    function _hasCommited(uint _pollId, address _address) private view returns (bool) {
        return commits[_pollId].addresses[_address].hashed != bytes32(0);
    }

}
