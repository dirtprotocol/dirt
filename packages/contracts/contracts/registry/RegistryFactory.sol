pragma solidity ^0.5.0;


import "../interfaces/IRegistryFactory.sol";
import "../interfaces/IVoteController.sol";
import "./ChallengeableRegistry.sol";
import "../interfaces/IParameterSource.sol";

/**
 *@title RegistryFactory
 *@notice When someone creates a new registry, we use the registry factory to
 * create a new contract to maintain that registry. This also allows us to
 * spawn different kinds of registries as well as upgrading them as we see fit.
 */
contract RegistryFactory is IRegistryFactory {

    IParameterSource private parametersAddress;

    uint256  public constant DEFAULT_MIN_VOTE_INCREMENTAL_STAKE = 0;
    uint256  public constant DEFAULT_MIN_STAKE = 1;
    uint256  public constant DEFAULT_MIN_VOTE_STAKE = 1;
    uint256  public constant DEFAULT_CHALLENGE_PENALTY = 50;
    uint256  public constant DEFAULT_CHALLENGE_DISTRIBUTION = 50;
    uint256  public constant DEFAULT_VOTE_PENALTY = 10;
    uint256  public constant DEFAULT_CHALLENGE_LENGTH = 1 days;

    constructor(IParameterSource _parametersAddress) public {
        require(_parametersAddress != IParameterSource(0), "Parameter address must be set.");
        parametersAddress = _parametersAddress;
    }

    function create(string calldata _voteStyle, uint _minStake, uint _minVoteStake) external returns (address _newAddress) {

        // Ensure there is an implementation for the vote style

        // TODO: address voteAddress = IParameterSource(parametersAddress).getAddress("VOTE", _voteStyle);

        // require(voteAddress != address(0), "Vote style must be known to parameter source");

        ChallengeableRegistry newRegistry = new ChallengeableRegistry(
            parametersAddress,
            _minStake,
            _voteStyle,
            DEFAULT_CHALLENGE_PENALTY,
            DEFAULT_VOTE_PENALTY,
            DEFAULT_CHALLENGE_LENGTH,
            DEFAULT_CHALLENGE_DISTRIBUTION,
            _minVoteStake,
            DEFAULT_MIN_VOTE_INCREMENTAL_STAKE
        );

        return address(newRegistry);
    }
}
