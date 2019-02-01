const Registry = artifacts.require("TestChallengeableRegistry");
const PublicVoteController = artifacts.require("TestPublicVoteController");
const Token = artifacts.require("TestProtocolToken");

const Utils = require('../util/contract-utils');
const Enums = require('../util/enums')
const ContractAssert = require('../util/assert.js');
const TokenValue = require('@dirt/lib').TokenValue;

contract('PublicVoteController.PayoutExpiredState', (accounts) => {

  let rawInstance = null;
  let users = [];
  var publicVC = null;
  var pollId = null;
  var key = null;

  const INCUMBENT_STAKE = 11
  const CHALLENGER_STAKE = 12
  const MAJORITY_STAKE = 24
  const MINORITY_STAKE = 17
  const TOTALPOT = INCUMBENT_STAKE + CHALLENGER_STAKE + MAJORITY_STAKE + MINORITY_STAKE

  before('Setup registry', async () => {
      rawInstance = await Registry.deployed();

      users = await Utils.createAccountInstances(artifacts, web3, accounts, 500, async (user, idx) => {
          user.registry = await user.dirt.getRegistryAtAddress(rawInstance.address, "ChallengeableRegistry");
          user.dirt.Token.approveFor(user.registry.address, TokenValue.from(500));
      });

      publicVC = await PublicVoteController.deployed()
      token = await Token.deployed()
  });

  after('cleanup', async () => {
      await rawInstance.deleteItemsAndReturnFunds();
  });

  beforeEach("Set up poll", async () => {
      key = Utils.randomName()
      const item = await users[0].registry.addItem(key, "Incumbent Value", TokenValue.from(INCUMBENT_STAKE))
      const challenge = await users[1].registry.challenge(key, "Challenger Value", TokenValue.from(CHALLENGER_STAKE))
      pollId = (await rawInstance.getPollId(key)).toNumber()

      // Majority voter votes
      const vote_by_user2 = await users[2].registry.getVoteInstance(key);
      await vote_by_user2.vote(Enums.Candidate.Challenger, TokenValue.from(MAJORITY_STAKE))
      await publicVC.testOnlyRecordUserVoted(pollId, users[2].address)

      // Minority voter votes
      const vote_by_user3 = await users[3].registry.getVoteInstance(key);
      await vote_by_user3.vote(Enums.Candidate.Incumbent, TokenValue.from(MINORITY_STAKE))
      await publicVC.testOnlyRecordUserVoted(pollId, users[3].address)

      await rawInstance.expireChallenge(key)
      await publicVC.resolve(pollId)

      await publicVC.claimPayout(pollId, { from: accounts[1] }) // challenger/winner
      await publicVC.claimPayout(pollId, { from: accounts[2] }) // majority voter
      await publicVC.claimPayout(pollId, { from: accounts[0] }) // incumbent/loser
      // minority voter didn't claim their payout
      // await publicVC.claimPayout(pollId, { from: accounts[3] }) // minority voter

      await publicVC.forcePayoutExpiredState(pollId)
  })

  afterEach("teardown poll", async () => {
    await publicVC.resetTokenPot()
  })

  describe("when poll claim time has expired", async () => {
    it("can close the poll", async () => {
      var amount = await publicVC.getPotAmount.call(pollId)
      assert.equal(TokenValue.fromRaw(amount).value, 8.5, "Wrong amount left in pot")

      await publicVC.close(pollId)

      amount = await publicVC.getPotAmount.call(pollId)
      assert.equal(TokenValue.fromRaw(amount).value, 0, "All funds should have been transferred out")
    })
  })

  describe("disallowed transitions", async () => {

    it("cannot beginVote", async () => {
      await ContractAssert.assertError(
        users[1].registry.challenge(key, "Challenger Value", TokenValue.from(CHALLENGER_STAKE)),
        ContractAssert.errTypes('revert')
      )
    })

    it("cannot vote", async () => {
      await ContractAssert.assertError(
        publicVC.vote(pollId, Enums.Candidate.Challenger, MAJORITY_STAKE * 10**18, accounts[0]),
        ContractAssert.errTypes('revert')
      )
    })

    it("cannot claimPayout", async () => {
      for (let i = 0; i < accounts.length; i++) {
        await ContractAssert.assertError(
          publicVC.claimPayout(pollId, { from: accounts[i] }),
          ContractAssert.errTypes('revert')
        )
      }
    })

  })


});
