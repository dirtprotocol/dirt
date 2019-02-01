const Registry = artifacts.require("TestChallengeableRegistry");
const PublicVoteController = artifacts.require("TestPublicVoteController");
const Token = artifacts.require("TestProtocolToken");

const Utils = require('../util/contract-utils');
const Enums = require('../util/enums')
const ContractAssert = require('../util/assert.js');
const TokenValue = require('@dirt/lib').TokenValue;

contract('PublicVoteController.ResolvedState', (accounts) => {

  let rawInstance = null;
  let users = [];
  var publicVC = null;
  var token = null;
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

  describe("when resolved state", async () => {
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
    })

    afterEach("teardown poll", async () => {
      await publicVC.resetTokenPot()

      // TODO currently can't check remaining pot, because can't clear token amount
      // console.log(TokenValue.fromRaw(await token.balanceOf.call(publicVC.address)).value)
      // console.log(TokenValue.fromRaw(await token.balanceOf.call(users[0].address)).value)
      // let remaining = TokenValue.fromRaw(await token.balanceOf.call(publicVC.address)).value
      // await token.approve(publicVC.address, remaining * 10**18)
      // await token.transferFrom(publicVC.address, users[0].address, remaining * 10**18, { from: publicVC.address })

      // console.log(TokenValue.fromRaw(await token.balanceOf.call(publicVC.address)).value)
    })

    it("Can claim payout for challenger/winner, but not twice", async () => {
        let account = accounts[1]

        let oldBalance = TokenValue.fromRaw(await token.balanceOf.call(account)).value
        let tx = await publicVC.claimPayout(pollId, { from: account })
        let newBalance = TokenValue.fromRaw(await token.balanceOf.call(account)).value

        assert.equal(newBalance - oldBalance, 10.266666666666652, "Wrong payout amount")
        assert.equal(await publicVC.pollExists.call(pollId), true, `Vote shouldn't be deleted`)

        await ContractAssert.assertError(
          publicVC.claimPayout(pollId, { from: account }),
          ContractAssert.errTypes('revert')
        )

        let remainingPot = TokenValue.fromRaw(await publicVC.getPotAmount.call(pollId)).value
        assert.equal(remainingPot, 41.733333333333334, "Remaining Pot amount incorrect")
    })

    it("Can ask for payout amount", async () => {
        let account = accounts[1]
        let amount = await publicVC.getPayoutAmount.call(pollId, { from: account })

        assert(amount, "should get some number back")
    })

    it("Can claim payout for majority voter, but not twice", async () => {
        let account = accounts[2]

        let oldBalance = TokenValue.fromRaw(await token.balanceOf.call(account)).value
        let tx = await publicVC.claimPayout(pollId, { from: account })
        let newBalance = TokenValue.fromRaw(await token.balanceOf.call(account)).value

        assert.equal(newBalance - oldBalance, 27.73333333333335, "Wrong payout amount")
        assert.equal(await publicVC.pollExists.call(pollId), true, `Vote shouldn't be deleted`);

        await ContractAssert.assertError(
          publicVC.claimPayout(pollId, { from: account }),
          ContractAssert.errTypes('revert')
        )

        // let remainingPot = TokenValue.fromRaw(await publicVC.getTotalPot.call()).value
        // assert.equal(remainingPot, 41.733333333333334, "Remaining Pot amount incorrect")
    })

    it("Can claim payout for incumbent/loser, but not twice", async () => {
        let account = accounts[0]

        let oldBalance = TokenValue.fromRaw(await token.balanceOf.call(account)).value
        let tx = await publicVC.claimPayout(pollId, { from: account })
        let newBalance = TokenValue.fromRaw(await token.balanceOf.call(account)).value

        assert.equal(newBalance - oldBalance, 5.5, "Wrong payout amount")
        assert.equal(await publicVC.pollExists.call(pollId), true, `Vote shouldn't be deleted`);

        await ContractAssert.assertError(
          publicVC.claimPayout(pollId, { from: account }),
          ContractAssert.errTypes('revert')
        )
    })

    it("Can claim payout for minority voter, but not twice", async () => {
        let account = accounts[3]

        let oldBalance = TokenValue.fromRaw(await token.balanceOf.call(account)).value
        let tx = await publicVC.claimPayout(pollId, { from: account })
        let newBalance = TokenValue.fromRaw(await token.balanceOf.call(account)).value

        assert.equal(newBalance - oldBalance, 8.5, "Wrong payout amount")
        assert.equal(await publicVC.pollExists.call(pollId), true, `Vote shouldn't be deleted`);

        await ContractAssert.assertError(
          publicVC.claimPayout(pollId, { from: account }),
          ContractAssert.errTypes('revert')
        )
    })

    it("Cannot claim payout for non-stakeholder", async () => {
        await ContractAssert.assertError(
            publicVC.claimPayout(pollId, { from: users[4].address }),
            ContractAssert.errTypes('revert')
        )

        assert.equal(await publicVC.pollExists.call(pollId), true, `Vote shouldn't be deleted`);
    })

  })

  describe("disallowed transitions", async () => {
    beforeEach("Set up poll for transitions", async () => {
      key = Utils.randomName()
      const item = await users[0].registry.addItem(key, "Incumbent Value", TokenValue.from(INCUMBENT_STAKE))
      const challenge = await users[1].registry.challenge(key, "Challenger Value", TokenValue.from(CHALLENGER_STAKE))
      pollId = (await rawInstance.getPollId(key)).toNumber()
    })

    it("cannot beginVote", async () => {
      await ContractAssert.assertError(
        users[1].registry.challenge(key, "Challenger Value", TokenValue.from(CHALLENGER_STAKE)),
        ContractAssert.errTypes('revert')
      )
    })

    it("cannot resolve", async () => {
      for (let i = 0; i < accounts.length; i++) {
        await ContractAssert.assertError(
          publicVC.resolve(pollId, { from: accounts[i] }),
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

});
