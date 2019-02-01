pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../node_modules/@dirt/contracts/contracts/registry/ChallengeableRegistry.sol";
import "../node_modules/@dirt/contracts/contracts/interfaces/IVoteController.sol";
import "../node_modules/@dirt/contracts/contracts/interfaces/IParameterSource.sol";
import "../node_modules/@dirt/contracts/contracts/interfaces/IVoteController.sol";
import "../node_modules/@dirt/contracts/contracts/interfaces/ICommitRevealVoteController.sol";
import "./TestIVoteController.sol";
import "./Reset.sol";

contract TestChallengeableRegistryCommit is ChallengeableRegistry, Reset {

    constructor(IParameterSource _parametersAddress)
        public ChallengeableRegistry(
            _parametersAddress,
            100,
            "COMMIT_REVEAL",
            50,
            50,
            1 days,
            60,
            1,
            1)
    {
    }

    function testVoteStyleCreation() public view returns (address) {

        address voteAddress = parameters.getAddress("VOTE", voteStyle);
        require(voteAddress != address(0));
        IVoteController controller = IVoteController(voteAddress);
        require(address(controller) != address(0));
        return voteAddress;
    }

    function testVoteStyleReading() public view returns (string memory) {
        address voteAddress = parameters.getAddress("VOTE", voteStyle);
        IVoteController controller = IVoteController(voteAddress);
        return controller.getStyleName();
    }

    function expireVotePeriod(string memory _key) public returns (bool success) {
        TestIVoteController controller = TestIVoteController(address(challenges[_key].voteContract));
        controller.forceExpire(challenges[_key].voteId);
        return true;
    }

    function expireRevealPeriod(string memory _key) public returns (bool) {
        ICommitRevealVoteController controller = ICommitRevealVoteController(address(challenges[_key].voteContract));
        return controller.forceExpireRevealState(challenges[_key].voteId);
    }

    function deleteItemsAndReturnFunds() public returns (bool success) {
        // NOTE: This is could be repurposed for an "escape hatch".
        for (uint i = 0; i < registry.getItemCount(); i++) {
            string memory key = registry.getKeyOfItem(i);

            // Return the deposit to the token contract
            // TODO
            //_withdrawTo(items[itemIndex[i]].owner, stake.value);

            delete itemStakes[key];

            // Delete pending votes (TODO: refund)
            delete challenges[key];
        }

        _resetRegistry(registry);

        return true;
    }
}
