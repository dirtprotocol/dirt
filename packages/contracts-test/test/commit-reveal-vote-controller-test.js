const Registry = artifacts.require("TestChallengeableRegistryCommit");
const Utils = require('../util/contract-utils');
const TokenValue = require('@dirt/lib').TokenValue;

contract('CommitRevealVoteController', (accounts) => {
  let rawInstance = null;
  let users = [];

  before('Setup registry', async () => {
    rawInstance = await Registry.deployed();

    users = await Utils.createAccountInstances(artifacts, web3, accounts, 500, async (user, idx) => {
      user.registry = await user.dirt.getRegistryAtAddress(rawInstance.address, "ChallengeableRegistry");
      user.dirt.Token.approveFor(user.registry.address, TokenValue.from(500));
    });
  });

  after('cleanup', async () => {
      await rawInstance.deleteItemsAndReturnFunds();
  });

  describe("when has poll and there is one vote", async () => {
    var key = null;
    var vote0 = null;

    beforeEach('set up', async () => {
      key = Utils.randomName();

      const initialStakeValue = TokenValue.from(1);
      const item = await users[0].registry.addItem(key, "Hello", TokenValue.from(1));
      const challenge = await users[1].registry.challenge(key, "Better", TokenValue.from(2));

      vote0 = await users[0].registry.getVoteInstance(key);
    })

    it("Allows challenges to be created", async () => {
      let status = await vote0.getStatus();

      assert.equal(users[0].registry.voteStyle, "COMMIT_REVEAL");
      assert.equal(vote0.style, "COMMIT_REVEAL");

      assert.equal(status.incumbent.totalVoteValue.value, 1, 'Incumbent vote has correct value');
      assert.equal(status.challenger.totalVoteValue.value, 2, 'Challenger vote has correct value');
    });

    it("Allows users to commit votes", async () => {
      const vote0Salt = 1234;

      let balance0Before = await users[0].dirt.Token.balanceOf();
      await vote0.commit(1, vote0Salt, TokenValue.from(1));

      // Confirm 1 + 1 is taken
      let balance0After = await users[0].dirt.Token.balanceOf();

      let expected = balance0Before.value - 1;

      assert.equal(balance0After.value, expected, "Stake taken from user");
    });

    it("Allows users to reveal votes", async () => {
      const vote0Salt = 1234;
      await vote0.commit(1, vote0Salt, TokenValue.from(1));

      let balance0BeforeReveal = await users[0].dirt.Token.balanceOf();

      // Enter reveal stage
      await rawInstance.expireVotePeriod(key);
      await vote0.reveal(1, vote0Salt);

      let status = await vote0.getStatus();

      assert.equal(status.incumbent.totalVoteValue.value, 2, `Total vote value increased to stake + vote`);

      // Shouls be refunded 1
      let balance0AfteReveal = await users[0].dirt.Token.balanceOf();
      let expected = balance0BeforeReveal.value;

      assert.equal(balance0AfteReveal.value, expected, "Reveal refunds commit stake to user");
    });

  })
});