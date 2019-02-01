const Registry = artifacts.require("TestChallengeableRegistry");
const PublicVoteController = artifacts.require("TestPublicVoteController");

const Utils = require('../util/contract-utils');
const Enums = require('../util/enums');
const ContractAssert = require('../util/assert.js');
const TokenValue = require('@dirt/lib').TokenValue;

contract('PublicVoteController.ExpiredState', (accounts) => {

  describe("when expired state", async () => {

    let rawInstance = null;
    let users = [];
    var publicVC = null;
    var pollId = null;

    const INCUMBENT_STAKE = 10
    const CHALLENGER_STAKE = 11

    before('Setup registry', async () => {
      rawInstance = await Registry.deployed();

      users = await Utils.createAccountInstances(artifacts, web3, accounts, 500, async (user, idx) => {
          user.registry = await user.dirt.getRegistryAtAddress(rawInstance.address, "ChallengeableRegistry");
          user.dirt.Token.approveFor(user.registry.address, TokenValue.from(500));
      });

      publicVC = await PublicVoteController.deployed()
    })

    after('cleanup', async () => {
      await rawInstance.deleteItemsAndReturnFunds();
    })


    describe("when vote time has expired", async () => {
      beforeEach("Set up poll for transitions", async () => {
        key = Utils.randomName()
        const item = await users[0].registry.addItem(key, "Incumbent Value", TokenValue.from(INCUMBENT_STAKE))
        const challenge = await users[1].registry.challenge(key, "Challenger Value", TokenValue.from(CHALLENGER_STAKE))
        pollId = (await rawInstance.getPollId(key)).toNumber()

        await rawInstance.expireChallenge(key)
      })

      it("can resolve with a winnner", async () => {
        let tx = await publicVC.resolve(pollId, { from: accounts[0] })
        assert.equal(await publicVC.pollResolved.call(pollId), true, "poll wasn't resolved")

        let winner = await publicVC.getWinner.call(pollId)
        assert.equal(winner.toNumber(), Enums.Candidate.Challenger)
        assert.equal(tx.logs[tx.logs.length - 1].event, "PollEnded", "Should have emitted PollEnded")
        assert.equal(tx.logs[tx.logs.length - 1].args.winner.toNumber(), Enums.Candidate.Challenger, "Challenger should have won")
      })
    })

    describe("disallowed transitions", async () => {
      beforeEach("Set up poll for transitions", async () => {
        key = Utils.randomName()
        const item = await users[0].registry.addItem(key, "Incumbent Value", TokenValue.from(INCUMBENT_STAKE))
        const challenge = await users[1].registry.challenge(key, "Challenger Value", TokenValue.from(CHALLENGER_STAKE))
        pollId = (await rawInstance.getPollId(key)).toNumber()

        await rawInstance.expireChallenge(key)
      })

      it("cannot beginVote", async () => {
        await ContractAssert.assertError(
          users[1].registry.challenge(key, "Challenger Value", TokenValue.from(CHALLENGER_STAKE)),
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

      it("cannot close", async () => {
        for (let i = 0; i < accounts.length; i++) {
          await ContractAssert.assertError(
            publicVC.close(pollId, { from: accounts[i] }),
            ContractAssert.errTypes('revert')
          )
        }
      })

    })

  })
})