const PureVotePayout = artifacts.require("VotePayout.sol")
const VotePayout = artifacts.require("TestVotePayout.sol")

const ContractAssert = require("../util/assert.js")
const Enums = require("../util/enums.js")
const Utils = require('../util/contract-utils');


contract('VotePayout', (accounts) => {

    const INCUMBENT_STAKE = 112
    const CHALLENGER_STAKE = 223
    const CHALLENGE_PENALTY= 24
    const CHALLENGE_DISTRIBUTION = 30
    const VOTE_PENALTY = 15

    var pureVotePayout;
    var votePayout;
    var events;
    var pollId = 0;

    describe("Pure vote payout tests", () => {

        before("Setup", async () => {
            // Directly use VotePayout lib to test pure functions
            pureVotePayout = await PureVotePayout.deployed()
        })

        it("can calculate fractional multiplication", async () => {
            var res = await pureVotePayout.fracMul.call(60, 25, 100)
            assert.equal(res.toNumber(), 15, "60 * 25% should be 15")

            res = await pureVotePayout.fracMul.call(60, 75, 100)
            assert.equal(res.toNumber(), 45, "60 * 75% should be 45")

            res = await pureVotePayout.fracMul.call(20, 150, 100)
            assert.equal(res.toNumber(), 30, "150% of 20 should be 30")

            res = await pureVotePayout.fracMul.call(1, 10, 100)
            assert.equal(res.toNumber(), 0, "10% of 1 should be 0")
        })

        it("can calculate fractional multiplication rounded down", async () => {
            var res = await pureVotePayout.fracMul.call(100, 1, 3)
            assert.equal(res.toNumber(), 33, "Math.floor(100 * 33.33%) should be 33")

            var res = await pureVotePayout.fracMul.call(90, 1, 7)
            assert.equal(res.toNumber(), 12, "Math.floor(90 * 1/7) should be 12")
        })

        it("cannot calculate fractional mult for negative numbers", async () => {
            await ContractAssert.assertError(
                pureVotePayout.fracMul.call(-60, 25, 100),
                ContractAssert.errTypes('revert')
            )
        })
    })

    describe("State changing Vote payout tests", () => {

        before('Setup up all vote payout tests', async () => {
            // console.log(accounts)
            votePayout = await VotePayout.deployed()
        })

        beforeEach('Set up the polling Data', async () => {
            // call once to create a poll. Incumbent is the loser
            var tx = await votePayout.createPoll(
                accounts[0], INCUMBENT_STAKE,
                accounts[1], CHALLENGER_STAKE,
                CHALLENGE_PENALTY,
                CHALLENGE_DISTRIBUTION,
                VOTE_PENALTY
            )
            pollId += 1;

            // Incumbent is the loser, according to setup.

            // Vote for incumbent (minority voter) Don't vote too much, or you'll win.
            tx = await votePayout.vote(pollId, Enums.Candidate.Incumbent, 20, { from: accounts[2] })
            tx = await votePayout.vote(pollId, Enums.Candidate.Incumbent, 13, { from: accounts[3] })

            // Vote for challenger (majority voter) Challenger also votes with majority
            tx = await votePayout.vote(pollId, Enums.Candidate.Challenger, 26, { from: accounts[1] })
            tx = await votePayout.vote(pollId, Enums.Candidate.Challenger, 31, { from: accounts[4] })
            tx = await votePayout.vote(pollId, Enums.Candidate.Challenger, 17, { from: accounts[5] })

            tx = await votePayout.forceExpire(pollId)
            tx = await votePayout.resolve(pollId)
        })

        afterEach('show logs', async () => {
            // Utils.showLogs(votePayout)
        })

        it("can calculate correct loser pot", async () => {
            let loserPot = await votePayout.loserPot.call(pollId)

            let expected = Math.floor(
                (INCUMBENT_STAKE * CHALLENGE_PENALTY + (20 + 13) * VOTE_PENALTY) / 100
            )
            assert.equal(loserPot.toNumber(), expected, "loser pot is incorrect")
        })

        it("can calculate correct total winning amount", async () => {
            let winningAmt = await votePayout.totalWinningAmt.call(pollId)

            let expected = CHALLENGER_STAKE + 26 + 31 + 17
            assert.equal(winningAmt.toNumber(), expected, "winning amount is incorrect")
        })

        it("can calculate correct payout amount to winner", async () => {
            let payout = await votePayout.winnerPayout.call(pollId)
            let loserPot = Math.floor(INCUMBENT_STAKE * CHALLENGE_PENALTY / 100 + (20 + 13) * VOTE_PENALTY / 100)
            let totalWinningAmt = CHALLENGER_STAKE + 26 + 31 + 17

            let winnerStake = CHALLENGER_STAKE
            let winnerStakeGain = loserPot * CHALLENGE_DISTRIBUTION / 100
            let winnerVoteGain = loserPot * (100 - CHALLENGE_DISTRIBUTION) / 100 * CHALLENGER_STAKE / totalWinningAmt

            let expected = Math.floor(winnerStakeGain + winnerVoteGain)

            assert.equal(payout.toNumber(), expected, "winner payout is incorrect")
        })

        it("can calculate correct payout amount to majority voters", async () => {
            let loserPot = Math.floor(INCUMBENT_STAKE * CHALLENGE_PENALTY / 100) +
                Math.floor((20 + 13) * VOTE_PENALTY / 100)
            let totalWinningAmt = CHALLENGER_STAKE + 26 + 31 + 17


            var payout = await votePayout.majorityVoterPayout.call(pollId, { from: accounts[1] })
            var gain = Math.floor(
                    Math.floor(loserPot * (100 - CHALLENGE_DISTRIBUTION) / 100) *
                    26 / totalWinningAmt
                )
            var expected = 26 + gain
            assert.equal(payout.toNumber(), expected, "accounts[1] majority voter payout")

            payout = await votePayout.majorityVoterPayout.call(pollId, { from: accounts[4] })
            gain = Math.floor(
                Math.floor(loserPot * (100 - CHALLENGE_DISTRIBUTION) / 100) *
                31 / totalWinningAmt
            )
            expected = 31 + gain
            assert.equal(payout.toNumber(), expected, "accounts[4] majority voter payout")

            payout = await votePayout.majorityVoterPayout.call(pollId, { from: accounts[5] })
            gain = Math.floor(
                Math.floor(loserPot * (100 - CHALLENGE_DISTRIBUTION) / 100) *
                17 / totalWinningAmt
            )
            expected = 17 + gain
            assert.equal(payout.toNumber(), expected, "accounts[5] majority voter payout")
        })

        it("can calculate correct payout amount to loser", async () => {
            let payout = await votePayout.loserPayout.call(pollId)
            let expected = Math.floor(INCUMBENT_STAKE * (100 - CHALLENGE_PENALTY) / 100)
            assert.equal(payout.toNumber(), expected, "loser payout is incorrect")
        })

        it("can calculate correct payout amount to minority voters", async () => {
            var payout = await votePayout.minorityVoterPayout.call(pollId, { from: accounts[2] })
            var expected = Math.floor(20 * (100 - VOTE_PENALTY) / 100)
            assert.equal(payout.toNumber(), expected, "accounts[2] minority payout is incorrect")

            var payout = await votePayout.minorityVoterPayout.call(pollId, { from: accounts[3] })
            var expected = Math.floor(13 * (100 - VOTE_PENALTY) / 100)
            assert.equal(payout.toNumber(), expected, "accounts[3] minority payout is incorrect")
        })

        it("sum of all payout is equal to the pot", async () => {
            let payouts = []

            payouts.push(await votePayout.winnerPayout.call(pollId))
            payouts.push(await votePayout.majorityVoterPayout.call(pollId, { from: accounts[1] }))
            payouts.push(await votePayout.majorityVoterPayout.call(pollId, { from: accounts[4] }))
            payouts.push(await votePayout.majorityVoterPayout.call(pollId, { from: accounts[5] }))
            payouts.push(await votePayout.loserPayout.call(pollId))
            payouts.push(await votePayout.minorityVoterPayout.call(pollId, { from: accounts[2] }))
            payouts.push(await votePayout.minorityVoterPayout.call(pollId, { from: accounts[3] }))

            let expected = INCUMBENT_STAKE + CHALLENGER_STAKE +
                20 + 13 +
                26 + 31 + 17

            let sum = payouts.reduce((t, e) => { t += e.toNumber(); return t }, 0)
            assert(sum <= expected, "sum of all payouts should be less than total staked")
        })

    })

})
