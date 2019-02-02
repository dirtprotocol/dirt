pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "./StakableRegistry.sol";
import "../interfaces/IVoteController.sol";
import "../interfaces/IVoteOrigin.sol";
import "../interfaces/IParameterSource.sol";

/**
 * @title ChallengeableRegistry
 * @author DIRT Protocol
 * @notice A registry where you can challenge the items in the registry
 * @dev Depending on the types of registries that we see in the future,
 * We merge this with StakeableRegistry
 */
contract ChallengeableRegistry is StakableRegistry, IVoteOrigin {

    uint256  public constant ABSOLUTE_MIN_STAKE = 0;
    uint256  public constant ABSOLUTE_MAX_STAKE = 500000000e18;

    /**
     * @notice When a registry item is challenged, the registry needs to maintain
     * a link to the VoteController
     */
    struct VoteReference {
        IVoteController voteContract;
        uint voteId;
        bool pendingCreation;
    }

    /**
     * @notice Each registry has settings as to how to hold a vote. This is
     * passed to the VoteController every time an item is challenged.
     */
    IVoteController.VoteConfiguration public voteConfiguration;

    /**
     * @notice Each registry has a voting style type. This determines which
     * voting style is invoked when an item is challenged.
     */
    string public voteStyle;

    /**
     * @notice A reference to the parameters that holds addresses to other
     * contracts that this contract needs to interact with.
     */
    IParameterSource internal parameters;

    /**
     * @notice A reference of all the challenges across the entire registry.
     * The key of mapping takes the key of a registry item.
     */
    mapping(string => VoteReference) internal challenges;

    // @dev TODO rename these events from Vote to Poll
    event VoteStarted(string key, address indexed voteContract, uint indexed voteId);
    event VoteCompleted(string key, address indexed voteContract, uint indexed voteId);
    /**
     * @notice Creates a new ChallengeableRegistry
     * @param _minStake the minimum stake you can put into a challenge
     * @param _style the voting style used when an item is challenge
     * @param _challengePenalty the % tokens lost when challenger loses a poll
     * @param _votePenalty the % tokens lost when minority voter losers a poll
     * @param _challengeLength the amount of time a challenge exists
     * @param _challengeDistribution % of loser pot that is distributed amongst
     * majority voters
     * @param _minVoteStake minimum amount of stake you need to put in a vote
     * @param _minVoteStake minimum amount of stake you need to increase a vote
     */
    constructor(
        IParameterSource _parametersAddress,
        uint256 _minStake,
        string memory _style,
        uint256 _challengePenalty,
        uint256 _votePenalty,
        uint256 _challengeLength,
        uint256 _challengeDistribution,
        uint256 _minVoteStake,
        uint256 _minVoteIncrementalStake
    )
        public
        StakableRegistry(_parametersAddress, _minStake)
    {
        require(bytes(_style).length > 0, "CR:ctr:_s.length>0");
        require(_challengePenalty <= 100, "CR:ctr:_cP<=100");
        require(_votePenalty <= 100, "CR:ctr:_vP<= 100");
        require(_votePenalty > 0, "CR:ctr:_vP>0");
        require(_challengeLength >= 1 hours, "CR:ctr:_cL>1h");
        require(_challengeDistribution <= 100, "CR:ctr:_cD<=100");

        require(_minStake >= ABSOLUTE_MIN_STAKE, "CR:ctr:_mS>0");
        require(_minStake <= ABSOLUTE_MAX_STAKE, "CR:ctr:_mS<Max");
        require(_minVoteStake >= ABSOLUTE_MIN_STAKE, "CR:ctr:_mVS>0");
        require(_minVoteStake <= ABSOLUTE_MAX_STAKE, "CR:ctr:_mVS<Max");
        require(_minVoteIncrementalStake <= ABSOLUTE_MAX_STAKE, "CR:ctr:_mVIS<Max");

        voteStyle = _style;

        voteConfiguration.style = _style;
        voteConfiguration.challengePenalty = _challengePenalty;
        voteConfiguration.votePenalty = _votePenalty;
        voteConfiguration.challengeLength = _challengeLength;
        voteConfiguration.challengeDistribution = _challengeDistribution;
        voteConfiguration.minVoteStake = _minVoteStake;
        voteConfiguration.minVoteIncrementalStake = _minVoteIncrementalStake;

        parameters = IParameterSource(_parametersAddress);
    }

    // External functions

    // External functions that are view

    // External functions that are pure

    // Public functions

    /**
     * @notice Edit the value of a registry item
     *@param key of registry item
     * @param _value the content of the registry item
     * @return true when succeeds
     */
    function editItem(string memory _key, string memory _value) public returns (bool) {
        /* Checks */
        //@dev we check msg.sender inside of registry.editItem()
        require(!isItemChallenged(_key)); // "cannot edit item when challenged"

        /* Effects */
        registry.editItem(_key, _value);

        /* Interactions */
        return true;
    }

    /**
     * @notice Delete the registry item
     *@param: key of registry item
     */
    function deleteItem(string memory _key) public returns (bool) {
        // Can't delete an item whilst a vote is active
        require(!isItemChallenged(_key)/* , "Item cannot be deleted whilst challenged." */);
        return super.deleteItem(_key);
    }

    /**
     * @notice Challenge a registry item. Challenger thinks it's wrong, and is
     * staking tokens with it.
     */
    // TODO: Only this contract should be able to call this function.
    function challengeItem(
        string memory _itemKey,
        string memory _newItemValue,
        uint256 _challengeStake,
        address _from
    )
        public
        returns (bool, uint)
    {
        /* Checks */

        require(registry.hasItem(_itemKey), "CR:cI:hasItem");
        require(!isItemChallenged(_itemKey), "CR:cI:!isIC");
        require(getItemStake(_itemKey) < _challengeStake, "CR:gIS<_cS");
        require(isChallengeValueDiff(_itemKey, _newItemValue), "CR:CI:diff");

        // If we someday change this to allow people to supply their own
        // vote controller, we'll need to carefully consider the security
        // implications. Because we move funds before calling beginVote on
        // the vote controller, we would need to be very cautious about avoiding
        // a reentrancy attack.
        address voteAddress = parameters.getAddress("VOTE", voteStyle);
        require(voteAddress != address(0), "CR:cI:vA!=0");

        /* Effects */

        IVoteController.VoteDescriptor memory descriptor = _createDescriptor(
          _itemKey, _from, _newItemValue, _challengeStake
        );

        challenges[_itemKey].pendingCreation = true;
        challenges[_itemKey].voteContract = IVoteController(voteAddress);

        /* Interactions */

        require(tokenReceiver.depositHere(_challengeStake, _from), "CR:cI:_dH");

        _moveFundsToVoteContract(descriptor, voteAddress);

        IVoteController voteController = IVoteController(voteAddress);

        bool success = false;
        uint voteId = 0;
        (success, voteId) = voteController.beginVote(descriptor);

        require(success, "CR:CI:bV failed");
        require(voteId > 0, "CR:CI:bV->voteId=0");

        // NOTE pendingCreation is a mutex to prevent people from
        // calling beginVote directly, and creating a vote when an item isn't challenged
        challenges[_itemKey].pendingCreation = false;
        challenges[_itemKey].voteId = voteId;

        emit VoteStarted(_itemKey, voteAddress, voteId);
        return (true, voteId);
    }

    /**
     * @notice update the registry based on the outcome of a vote
     * @param _voteId the id of the poll
     *@param the registry item key
     * @param _winner the winner of the poll
     * @param _value the updated value of the registry item
     * @param _stake the updated amount the new owner now stakes in the registry item
     * @return true if success
     */
    function assignVoteOutcome(
        uint _voteId,
        string calldata _key,
        address _winner,
        string calldata _value,
        uint256 _stake
    )
        external
        returns (bool)
    {
        if(challenges[_key].voteId != _voteId || address(challenges[_key].voteContract) != msg.sender) {
            return false;
        }

        if(!tokenReceiver.attributeUnowned(_winner, _stake)) {
            return false;
        }

        _transferItem(_key, _winner, _value, _stake);

        delete challenges[_key];

        emit VoteCompleted(_key, address(challenges[_key].voteContract), challenges[_key].voteId);

        return true;
    }

    // Public functions that are views

    /**
     * @notice A registry item's active vote. If the registry item is not being
     * challenged, it will return a zero for the address.
     * @dev TODO Need to handle the case where the registry item isn't being challenged.
     *@param the key of the registry item
     * @return address: address of the VoteController for this registry item's challenge poll
     * @return uint: the voteID of the registry item's challenge poll
     */
    function getActiveVote(string memory _key) public view returns (address, uint) {
        return (address(challenges[_key].voteContract), challenges[_key].voteId);
    }

    function isVotePending(string calldata _key) external view returns (bool) {
        return challenges[_key].pendingCreation && msg.sender == address(challenges[_key].voteContract);
    }

    // Internal functions

    function isChallengeValueDiff(
        string memory _key,
        string memory _newValue
    )
        internal
        view
        returns (bool)
    {
        address owner;
        string memory currValue;
        uint ts;
        (owner, currValue, ts) = registry.getItem(_key);
        return keccak256(abi.encodePacked(currValue)) != keccak256(abi.encodePacked(_newValue));
    }

    /**
     * @notice lets you know if the item currently being challenged
     *@param the registry item key
     * @return bool true if the item is being challenged.
     */
    function isItemChallenged(string memory _key) internal view returns (bool) {
        return challenges[_key].voteId != 0;
    }

    // Private functions

    /**
     * @notice a helper function that moves the candidate stakes to the vote contract
     * @param _descriptor the settings that dictate how a VoteController behaves
     * @param voteAddress the voting contract address to move the funds to.
     */
    function _moveFundsToVoteContract(
        IVoteController.VoteDescriptor memory _descriptor,
        address voteAddress
    ) private {
        // Transfer both the candidates stakes to the voting contract
        uint256 totalInitialStake = SafeMath.add(_descriptor.incumbent.stake, _descriptor.challenger.stake);

        tokenReceiver.transferDeposit(_descriptor.incumbent.owner, voteAddress, _descriptor.incumbent.stake);
        tokenReceiver.transferDeposit(_descriptor.challenger.owner, voteAddress, _descriptor.challenger.stake);
        tokenReceiver.withdrawTo(voteAddress, totalInitialStake);
    }

    /**
     * @notice create the vote description
     *@param the registry item key
     * @param _challenger the challenger
     * @param _newValue the new value to insert if the challenger wins
     * @param _challengeStake the amount challenger is staking to challenge item
     * @return a VoteDescriptor
     */
    function _createDescriptor(
        string memory _key,
        address _challenger,
        string memory _newValue,
        uint256 _challengeStake
    )
        private
        view
        returns (IVoteController.VoteDescriptor memory)
    {
        address incumbentOwner;
        string memory incumbentValue;
        uint _ts;
        uint256 incumbentStake;
        (incumbentOwner, incumbentValue, _ts, incumbentStake) = getItemWithStake(_key);

        // require(incumbentOwner != _challenger, "Owner of item may not challenge themselves");

        IVoteController.VoteDescriptor memory descriptor;
        descriptor.key = _key;

        // Incumbent
        descriptor.incumbent.owner = incumbentOwner;
        descriptor.incumbent.value = incumbentValue;
        descriptor.incumbent.stake = incumbentStake;

        // Chanllenger
        descriptor.challenger.owner = _challenger;
        descriptor.challenger.value = _newValue;
        descriptor.challenger.stake = _challengeStake;

        descriptor.configuration = voteConfiguration;

        return descriptor;
    }

}
