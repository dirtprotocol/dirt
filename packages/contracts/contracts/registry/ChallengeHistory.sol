pragma solidity ^0.5.0;

/**
 * @title VoteHistory maintains a list of challenge votes for each registry item
 * @notice When a vote has occured for an item, we want to keep track of it here.
 * @author DIRT protocol
 */
library ChallengeHistory {

    /**
     * @notice When a registry item is challenged, the registry needs to maintain
     * a link to the VoteController
     */
    struct VoteReference {
        address voteContract;
        uint voteId;
        bool pendingCreation;
    }

    struct Data {
        /**
         * @notice a reference all the challenges across the entire registry.
         * @notice the key of mapping takes the key of a registry item
         */
        mapping(string => VoteReference) challenges;

        /**
         * @notice a history of votes where a user is a stakeholder
         * @dev the key is the address of a user
         */
        // TODO rename to challengeHistory
        mapping(address => VoteReference[]) voteHistory;
    }

    /**
     * @notice Adds Vote Controller to user's history of participation. This can
     * only be called by the vote contract while a vote is active, before it
     * is resolved.
     * @param _key string the key of the registry entry
     * @params _stakeholder the address of the voter
     */
    function addVoteHistory(Data storage self, string memory _key, address _stakeholder) public returns (bool) {
        /* Checks */

        require(self.challenges[_key].voteContract == msg.sender, "CR:aVH:vC||this==msg.sdr");

        /* Effects */

        _addVoteHistory(self, _key, _stakeholder);

        /* Interactions */

        return true;
    }

    // Public functions that are views

    /**
     * @notice A registry item's active vote. If the registry item is not being
     * challenged, it will return a zero for the address.
     * @dev TODO Need to handle the case where the registry item isn't being challenged.
     * @params _key the key of the registry item
     * @return address: address of the VoteController for this registry item's challenge poll
     * @return uint: the voteID of the registry item's challenge poll
     */
    function getActiveVote(Data storage self, string memory _key) public view returns (address, uint) {
        return (self.challenges[_key].voteContract, self.challenges[_key].voteId);
    }

    function isVotePending(Data storage self, string memory _key) public view returns (bool) {
        return self.challenges[_key].pendingCreation && msg.sender == self.challenges[_key].voteContract;
    }

    /**
     * @notice gets a specific vote for a user.
     * @params _stakeholder the address of a vote participant
     * @params _index the index of the history to access. The zeroth index for
     * the history is the most recent vote for a user.
     * @return address the vote contract's address
     * @return uint the vote id
     *
     * @dev internally, this reads from the back to the front, so we can read
     * the most recent vote.
     */
     function getVoteHistory(Data storage self, address _stakeholder, uint256 _index)
        public
        view
        returns (
            address _voteContract,
            uint _voteId,
            bool _pendingCreation
        )
    {
        uint totalVotes = getVoteHistoryCount(self, _stakeholder);
        uint _reverseIndex = totalVotes - _index - 1;

        require(_reverseIndex >= 0, "CR:gVH:rI>0");

        VoteReference storage voteRef = self.voteHistory[_stakeholder][_reverseIndex];

        return (
            voteRef.voteContract,
            voteRef.voteId,
            voteRef.pendingCreation
        );
    }

    /**
     * @notice gets the number of vote histories for an address
     * @params _stakeholder the address of a vote participant
     * @return the number of votes a user participated in.
     */
    function getVoteHistoryCount(Data storage self, address _stakeholder) public view returns (uint) {
        return self.voteHistory[_stakeholder].length;
    }

    /**
     * @notice an internal version of adding vote history for when an item is challenged.
     * @notice assumes that a challenge has been created.
     * @dev The information for whether a user's address has already participated
     * in a vote is contained within the vote controller itself. Hence, we don't
     * need to have a separate mapping to keep track of unique votes for user.
     * However, this has side effect of exposing a public interface on vote
     * controllers to query for whether someone is a stakeholder in a vote or not.
     */
    function _addVoteHistory(Data storage self, string memory _key, address _stakeholder) public returns (bool) {
        //@dev not sure if pushing challenge[_key] directly is just a reference
        // or a clone, so explicitly copy instead.
        VoteReference memory voteRef;
        voteRef.voteContract = self.challenges[_key].voteContract;
        voteRef.voteId = self.challenges[_key].voteId;
        voteRef.pendingCreation = self.challenges[_key].pendingCreation;

        self.voteHistory[_stakeholder].push(voteRef);

        return true;
    }

}
