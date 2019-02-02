pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../interfaces/IVoteOrigin.sol";
import "./BaseVoteController.sol";

/**
 * @title PublicVoteController
 * @author DIRT protocol
 * @notice A Vote that's public. Everyone can see who voted for which side and for how much.
 */
contract PublicVoteController is BaseVoteController {

    address tokenAddress;

    constructor(address _parameterSource, address _slushAddress)
        public
        BaseVoteController(_parameterSource, _slushAddress)
    {
        tokenAddress = IParameterSource(_parameterSource).getAddress("CORE", "TOKEN");
    }

    function getStyleName() public pure returns (string memory _style) {
        return "PUBLIC";
    }

    function executeCall(address to, uint256 value, bytes memory data) internal returns (bool success) {
      assembly {
        success := call(gas, to, value, add(data, 0x20), mload(data), 0, 0)
      }
    }

    function receiveApproval(
        address from, uint256 _amount, address _token, bytes memory _data
    )
        public
    {
        require(msg.sender == tokenAddress);
        require(_amount > 0);
        bytes4 first = bytes4(_data[0]);
        bytes4 second = bytes4(_data[1]) >> 8;
        bytes4 third = bytes4(_data[2]) >> 16;
        bytes4 fourth = bytes4(_data[3]) >> 24;
        bytes4 firstFourBytes = first | second | third | fourth;
        require(firstFourBytes == 0x7c30dca5);
        // TODO: Replace executeCall
        require(executeCall(address(this), 0, _data));
    }

    function vote(uint _pollId, IVoteController.Candidate _candidate, uint256 _stake, address _from)
        public
        returns (bool _success)
    {
        Polling.Poll storage poll = pollData._getPoll(_pollId);

        /* Checks */

        require(pollActive(_pollId), "Vote must be active to vote.");
        require(poll.origin != address(0), "Vote has valid origin address");

        /* Effects */

        pollData.pushVote(_pollId, _candidate, _stake, _from);

        /* Interactions */

        require(tokenPot.depositHere(_pollId, _stake, _from), "Voting stake deposit must be successful.");

        // ask registry contract to keep a history of vote contracts.
        //@dev needs to be done before assignVoteOutcome() is called
        IVoteOrigin origin = IVoteOrigin(poll.origin);

        emit VoteCast(_pollId, _from, _stake);

        return true;
    }

    function increaseVote(uint _pollId, uint256 _additionalStake)
        public
        returns (bool _success)
    {
        /* Checks */
        require(pollActive(_pollId), "Vote must be active to increase voting stake.");

        /* Effects */
        require(pollData.increaseVote(_pollId, _additionalStake), "Increase vote must succeed");

        /* Interactions */
        require(tokenPot.depositHere(_pollId, _additionalStake, msg.sender), "Deposit of additional stake must be successful.");

        emit VoteIncreased(_pollId, msg.sender, _additionalStake);

        return true;
    }

    function getCandidate(uint _pollId)
        external
        view
        returns (IVoteController.Candidate)
    {
        return pollData.getICandidate(_pollId);
    }


}
