pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "./BaseVoteController.sol";
import "../interfaces/ICommitRevealVoteController.sol";


/**
 *@title LockedCommitRevealVoteController
 *@author DIRT protocol
 *@notice a voting style where the votes are hidden, and a voter needs to lock a
 * certain amount during the commit phase, and get it back during the reveal.
 *@notice See CommitRevealVoteController for more details
 */
contract LockedCommitRevealVoteController is Ownable, BaseVoteController, ICommitRevealVoteController {

    event LCRVoteRevealed(uint indexed pollId, address indexed voter);

    struct Commit {
        bytes32 hashed;
        uint256 voteStake;
        uint256 commitStake;
    }

    struct VoteCommits {
        uint256 revealExpiration;
        uint256 totalCommitStake;
        uint256 totalVoteStake;
        mapping(address => Commit) addresses;
        address[] addressesArray;
    }

    mapping(uint => VoteCommits) private commits;

    constructor(address _parameterSource, address _slushAddress)
        public
        BaseVoteController(_parameterSource, _slushAddress)
    {
        // do nothing
    }

    function forceExpireRevealState(uint _pollId) onlyOwner public returns (bool) {
        require(pollExists(_pollId), "Vote must exist");
        require(msg.sender == pollData.polls[_pollId].origin, "Can only be expired from owning contract");
        commits[_pollId].revealExpiration = block.timestamp;
        return true;
    }

    function revealActive(uint _pollId) public view returns (bool) {
        return pollExists(_pollId) &&
            !pollActive(_pollId) &&
            commits[_pollId].revealExpiration != 0 &&
            commits[_pollId].revealExpiration > block.timestamp;
    }

    function beginVote(IVoteController.VoteDescriptor memory _descriptor) public returns (bool _success, uint _id) {
        (_success, _id) = super.beginVote(_descriptor);
        require(_success, "Base vote must be created");

        uint challengeLength = _descriptor.configuration.challengeLength.mul(2);

        commits[_id].revealExpiration = block.timestamp.add(challengeLength);
    }

    function getStyleName() public pure returns (string memory _style) {
        return "LOCKED_COMMIT_REVEAL";
    }

    function commit(uint _pollId, bytes32 _secretHash, uint256 _stake, uint _commitStake) public returns (bool) {

        /* Checks */

        require(pollExists(_pollId), "Vote must exist");
        require(pollActive(_pollId), "Vote must be active");
        require(!_hasCommited(_pollId, msg.sender), "Sender has not previously commited");

        uint256 minStake = pollData.polls[_pollId].configuration.minVoteStake;
        require(_commitStake >= minStake, "Commit must be >= stake");
        require(_stake >= minStake, "Vote stake be be >= min voting stake");

        /* Effects */

        uint256 commitAndStake = _stake.add(_commitStake);

        commits[_pollId].addresses[msg.sender].hashed = _secretHash;
        commits[_pollId].addresses[msg.sender].voteStake = _stake;
        commits[_pollId].addresses[msg.sender].commitStake = _commitStake;
        commits[_pollId].totalCommitStake = commits[_pollId].totalCommitStake.add(_commitStake);
        commits[_pollId].totalVoteStake = commits[_pollId].totalVoteStake.add(_stake);

        /* Interactions */

        require(tokenPot.depositHere(_pollId, commitAndStake, msg.sender), "Depositing funds must succeed");

        emit VoteCast(_pollId, msg.sender, _stake);

        return true;
    }

    function increaseCommit(uint _pollId, uint256 _additionalStake) public returns (bool) {
        require(pollExists(_pollId), "Vote must exist");
        require(pollActive(_pollId), "Vote must be active");
        require(_hasCommited(_pollId, msg.sender), "Sender has previously commited");
        require(_additionalStake >= pollData.polls[_pollId].configuration.minVoteIncrementalStake);
        require(tokenPot.depositHere(_pollId, _additionalStake, msg.sender), "Deposit of additional stake must succeed");

        commits[_pollId].addresses[msg.sender].voteStake = commits[_pollId].addresses[msg.sender].voteStake.add(_additionalStake);
        commits[_pollId].totalVoteStake = commits[_pollId].totalVoteStake.add(_additionalStake);

        return true;
    }

    function revealVote(uint _pollId, IVoteController.Candidate _candidate, uint secret) public returns (bool) {
        require(revealActive(_pollId), "Reveal phase must be active");
        require(_hasCommited(_pollId, msg.sender), "Sender has previously commited");

        bytes32 expected = keccak256(abi.encodePacked(uint(_candidate), secret));

        Commit storage commitItem = commits[_pollId].addresses[msg.sender];

        require(commitItem.hashed == expected, "Reveal result must match commit");

        commits[_pollId].totalVoteStake = commits[_pollId].totalVoteStake.sub(commitItem.voteStake);
        commits[_pollId].totalCommitStake = commits[_pollId].totalCommitStake.sub(commitItem.commitStake);

        //@dev withdrawTo prevents double withdrawals
        require(tokenPot.withdrawTo(_pollId, msg.sender, commitItem.commitStake), "Withdraw of commit stake must be succesful");

        // TODO Shouldn't this also be required to succeed, like in PublicVote?
        pollData.pushVote(_pollId, _candidate, commitItem.voteStake, msg.sender);

        emit LCRVoteRevealed(_pollId, msg.sender);

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

    function _hasCommited(uint _pollId, address _address) private view returns (bool) {
        return commits[_pollId].addresses[_address].hashed != bytes32(0);
    }

}
