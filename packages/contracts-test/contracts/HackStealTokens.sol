pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../node_modules/@dirt/contracts/contracts/voting/Polling.sol";
import "../node_modules/@dirt/contracts/contracts/voting/PublicVoteController.sol";
import "../node_modules/@dirt/contracts/contracts/interfaces/IVoteController.sol";
import "../node_modules/@dirt/contracts/contracts/voting/BaseVoteController.sol";


contract HackStealTokens {
    using Polling for Polling.Data;

    Polling.Data internal pollData;

    function hackVote(
        string calldata key,
        IVoteController voteController,
        address incumbentAcct,
        address challengerAcct
    )
        external
        returns (bool _success)
    {

      IVoteController.VoteConfiguration memory config =
          IVoteController.VoteConfiguration({
              style: "PUBLIC",
              challengePenalty: 20,
              challengeDistribution: 20,
              votePenalty: 20,
              challengeLength: 1 days,
              minVoteStake: 1,
              minVoteIncrementalStake: 1
          });

      IVoteController.VoteCandidateDescriptor memory incumbent =
          IVoteController.VoteCandidateDescriptor({
              owner: incumbentAcct,
              value: "Incumbent Value",
              stake: 4
          });

      IVoteController.VoteCandidateDescriptor memory challenger =
          IVoteController.VoteCandidateDescriptor({
              owner: challengerAcct,
              value: "Challenger Value",
              stake: 5
          });

      IVoteController.VoteDescriptor memory descriptor =
          IVoteController.VoteDescriptor({
              key: key,
              incumbent: incumbent,
              challenger: challenger,
              configuration: config
          });

      voteController.beginVote(descriptor);

      return true;
    }

    function resolveVote(
      BaseVoteController voteController,
      uint pollId
    )
      external returns (bool) {
      voteController.resolve(pollId);
    }

    function isVotePending(string calldata key) external pure returns (bool) {
      return true;
    }

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
      return true;
    }
}
