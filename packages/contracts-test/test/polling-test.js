
const TestPolling = artifacts.require("TestPolling.sol");
const IVoteController = artifacts.require("IVoteController.sol");
const Utils = require('../util/contract-utils')
const Dirt = require('../util/dirt')
const Enums = require('../util/enums')

contract('Polling', (accounts) => {

  var polling = null


  beforeEach('Setup polling', async () => {
    polling = await TestPolling.deployed()

    await polling.createPoll(accounts[1], accounts[2])
  })

  afterEach('cleanup', async () => {
    try {
      await polling.deletePoll(1)
    } catch(err) {
      // no harm if there's no polls to delete
    }
  })

  it("Can create a poll", async () => {
    let pollId = 1

    numPolls = await polling.pollData_numPolls.call()
    assert.equal(numPolls.toNumber(), 1, "Didn't create a poll")

    let [expiration, winner, origin, key] =
      await polling.pollData_polls.call(pollId)
    assert.equal(origin, accounts[0], "originator of contract not the same")
    assert.equal(key, "Key of Data", "key of challenged item not correct")

    // test incumbent values
    var [owner, ownerStakeValue, voteValue, totalVoteValue, value] =
      await polling.pollData_polls_candidate(pollId, Enums.Candidate.Incumbent)
    assert.equal(owner, accounts[1], "owner of vote isn't right")
    assert.equal(ownerStakeValue.toNumber(), 100, "owner stake value isn't correct")
    assert.equal(voteValue.toNumber(), 0, "vote value isn't correct")
    assert.equal(totalVoteValue.toNumber(), 100, "total vote value isn't correct")
    assert.equal(value, "Incumbent Value", "value of item doesn't match")

    // test challenger values
    var [owner, ownerStakeValue, voteValue, totalVoteValue, value] =
      await polling.pollData_polls_candidate(pollId, Enums.Candidate.Challenger)
    assert.equal(owner, accounts[2], "owner of vote isn't right")
    assert.equal(ownerStakeValue.toNumber(), 101, "owner stake value isn't correct")
    assert.equal(voteValue.toNumber(), 0, "vote value isn't correct")
    assert.equal(totalVoteValue.toNumber(), 101, "total vote value isn't correct")
    assert.equal(value, "Challenger Value", "value of item doesn't match")
  })

  it("Can push a vote onto a poll", async () => {
    let pollId = 1
    await polling.pushVote(pollId, Enums.Candidate.Incumbent, 100)

    let [owner, ownerStakeValue, voteValue, totalVoteValue, value] =
      await polling.pollData_polls_candidate(pollId, Enums.Candidate.Incumbent)

    assert.equal(voteValue.toNumber(), 100, "vote value of just voters should increase from stake")
    assert.equal(totalVoteValue.toNumber(), 100 + 100, "total vote value should increase from stake")

    let voterValue = await polling.pollData_polls_candidate_voteValues(pollId, Enums.Candidate.Incumbent, accounts[0])
    assert.equal(voterValue.toNumber(), 100, "voter stake wasn't recorded")
  })

  // NOTE had to create a new Poll to work on, because resetting allVoters
  // in a poll wasn't working.
  it("Can increase an existing vote in poll", async () => {
    let pollId = 2
    await polling.createPoll(accounts[1], accounts[2])

    await polling.pushVote(pollId, Enums.Candidate.Incumbent, 100)
    await polling.increaseVote(pollId, 50)

    let [owner, ownerStakeValue, voteValue, totalVoteValue, value] =
      await polling.pollData_polls_candidate(pollId, Enums.Candidate.Incumbent)

    // incumbent already put 100 in.
    assert.equal(totalVoteValue.toNumber(), 100 + 100 + 50, "total vote value should increase")
    assert.equal(voteValue.toNumber(), 100 + 50, "vote value of the just voters should increase")

    let voterStake = await polling.pollData_polls_candidate_voteValues(pollId, Enums.Candidate.Incumbent, accounts[0])
    assert.equal(voterStake.toNumber(), 100 + 50, "voter stake wasn't recorded")
  })

  it("Can assign a winner after a vote", async () => {
    let pollId = 3
    await polling.createPoll(accounts[1], accounts[2])

    var [expiration, winner, origin, key] = await polling.pollData_polls(pollId)
    assert.equal(winner, Enums.Candidate.None, "There should be no winner yet")

    await polling.pushVote(pollId, Enums.Candidate.Incumbent, 100, { from: accounts[0] })
    await polling.pushVote(pollId, Enums.Candidate.Challenger, 100, { from: accounts[3] })

    let [iOwner, iOwnerStakeValue, iVoteValue, iTotalVoteValue, iValue] =
      await polling.pollData_polls_candidate(pollId, Enums.Candidate.Incumbent)
    assert.equal(iTotalVoteValue.toNumber(), 100 + 100, "total vote value not correct")

    let [cOwner, cOwnerStakeValue, cVoteValue, cTotalVoteValue, cValue] =
      await polling.pollData_polls_candidate(pollId, Enums.Candidate.Challenger)
    assert.equal(cTotalVoteValue.toNumber(), 101 + 100, "total vote value not correct")

    var [expiration, winner, origin, key] = await polling.pollData_polls(pollId)
    assert(expiration.toNumber() > Math.floor(Date.now() / 1000), "Should be expired")

    // action
    await polling.forceExpire(pollId)
    await polling.assignWinner(pollId)

    var [expiration, winner, origin, key] = await polling.pollData_polls(pollId)
    assert(expiration.toNumber() <= Math.floor(Date.now() / 1000), "Should be expired")
    assert.equal(winner, Enums.Candidate.Challenger, "The winner should be the challenger")
  })

})