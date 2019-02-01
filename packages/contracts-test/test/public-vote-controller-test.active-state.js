const Registry = artifacts.require("TestChallengeableRegistry");
const PublicVoteController = artifacts.require("TestPublicVoteController");

const Utils = require('../util/contract-utils');
const ContractAssert = require('../util/assert.js');
const TokenValue = require('@dirt/lib').TokenValue;

contract('PublicVoteController.ActiveState', (accounts) => {

  describe("when active state", async () => {

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


    describe("when different stakeholders vote", async () => {
      beforeEach("Set up poll for voting", async () => {
        key = Utils.randomName()
        const item = await users[0].registry.addItem(key, "Incumbent Value", TokenValue.from(INCUMBENT_STAKE))
        const challenge = await users[1].registry.challenge(key, "Challenger Value", TokenValue.from(CHALLENGER_STAKE))
        pollId = (await rawInstance.getPollId(key)).toNumber()
      })

      it("allows incumbent to vote", async () => {
        const vote = await users[0].registry.getVoteInstance(key);

        await vote.vote(1, TokenValue.from(12));

        let status = await vote.getStatus();
        assert.equal(status.incumbent.totalVoteValue.value, INCUMBENT_STAKE + 12, 'Incumbent vote value is not correct');
      })

      it("allows challenger to vote", async () => {
        const vote = await users[1].registry.getVoteInstance(key);

        await vote.vote(2, TokenValue.from(3));
        let status = await vote.getStatus();
        assert.equal(status.challenger.totalVoteValue.value, CHALLENGER_STAKE + 3, 'Challenger vote has correct value');
      })

      it("allows supporters to vote", async () => {
        let expectedIncumbentValue = INCUMBENT_STAKE
        let expectedChallengerValue = CHALLENGER_STAKE
        let status = null

        for (var i = 2; i < accounts.length - 2; i++) {
          const voteInstance = await users[i].registry.getVoteInstance(key)

          if (i % 2 == 0) {
            await voteInstance.vote(1, TokenValue.from(1))
            expectedIncumbentValue++;
          } else {
            await voteInstance.vote(2, TokenValue.from(1))
            expectedChallengerValue++
          }

          status = await voteInstance.getStatus()
        }

        assert.equal(status.incumbent.totalVoteValue.value, expectedIncumbentValue, 'Incumbent vote has correct value')
        assert.equal(status.challenger.totalVoteValue.value, expectedChallengerValue, 'Challenger vote has correct value')
      })

      // TODO can someone double vote?


      it("cannot increase vote if supporter never voted", async () => {
        const voteInstance = await users[0].registry.getVoteInstance(key)
      	let status = await voteInstance.getStatus()

      	assert.equal(status.incumbent.totalVoteValue, INCUMBENT_STAKE, "someone else voted for incumbent")

      	ContractAssert.assertError(
					publicVC.increaseVote(pollId, 10, { from: accounts[0] }),
      		ContractAssert.errTypes('revert')
      	)
      })

     //  it("can increase vote if supporter already voted", async () => {
     //    const voteInstance = await users[2].registry.getVoteInstance(key)
     //  	var status = await voteInstance.getStatus()
     //  	var expectedIncumbentValue = INCUMBENT_STAKE

     //  	await voteInstance.vote(pollId, TokenValue.from(5), { from: users[2].address })
     //  	status = await voteInstance.getStatus()
     //  	expectedIncumbentValue += 5
     //  	assert.equal(status.incumbent.totalVoteValue, expectedIncumbentValue, "wrong vote value after vote")

     //  	await publicVC.increaseVote(pollId, 10, { from: users[2].address })
     //  	// status = await voteInstance.getStatus()
     //  	// expectedIncumbentValue += 10
     //  	// assert.equal(status.incumbent.totalVoteValue.value, expectedIncumbentValue, "Incumbent didn't increase vote value")
	    // })

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

      it("allows viewing the token pot amount", async () => {
        let potamount = await publicVC.potAmount(pollId)
        potamount = potamount.toNumber()
        const expectedAmount = (CHALLENGER_STAKE + INCUMBENT_STAKE) * 10**18
        assert.equal(expectedAmount, potamount)
      })

      it("can get the IVoteController.Candidate", async () => {
        let candidate = await publicVC.getCandidate(pollId)
        assert.equal(candidate.toNumber(), 0)
      })
    })

  });
});
