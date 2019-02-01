const Token = artifacts.require("TestProtocolToken")
const TokenPot = artifacts.require("TestTokenPot")
const TokenValue = require('@dirt/lib').TokenValue

const Utils = require('../util/contract-utils')
const ContractAssert = require('../util/assert.js')

contract("TokenPot", (accounts) => {
  var token = null
  var tokenPot = null
  var pollId = 0

  before('Setup token pot', async () => {
    token = await Token.deployed()
    tokenPot = await TokenPot.deployed()
  })

  describe("when nothing has been deposited", async () => {
    beforeEach("Set up test", async () => {
      await token.approve(tokenPot.address, 15*10**18)
      pollId = 1
    })

    afterEach('Teardown token pot', async () => {
      var tx = await tokenPot.resetTokenPot()
      Utils.printLogs(tx.logs)
    })

    it("can attributed unowned tokens to the pot", async () => {
      var amount = TokenValue.fromRaw(await tokenPot.getPotAmount.call(pollId)).value
      assert.equal(amount, 0, "before attribution, there shouldn't be any in total Pot")

      await token.transfer(tokenPot.address, 15*10**18)
      await tokenPot.attributeUnownedToPot(pollId, 15*10**18)

      amount = TokenValue.fromRaw(await tokenPot.getPotAmount.call(pollId)).value
      assert.equal(amount, 15, "Wrong amount in total Pot after attribution")

      // test that another pollId doesn't have a pot amount
      amount = TokenValue.fromRaw(await tokenPot.getPotAmount.call(1000)).value
      assert.equal(amount, 0, "Wrong amount in other pollId's pot")
    })

    // TODO test can attribute partial amount?

    it("can deposit tokens", async () => {
      var tx = await tokenPot.depositHere(pollId, 15*10**18)

      amount = await tokenPot.getPotAmount.call(pollId)
      assert.equal(TokenValue.fromRaw(amount).value, 15, "total pot amount isn't correct")

      var evt = tx.logs.find((l) => l.event == 'PotDeposit')
      assert.equal(TokenValue.fromRaw(evt.args.potAmount).value, 15, "total pot in event isn't correct")
    })

    it("cannot withdraw tokens when not deposited", async () => {
      await ContractAssert.assertError(
        tokenPot.withdrawTo(pollId, accounts[0], 10),
        ContractAssert.errTypes('revert')
      )

      let amount = await tokenPot.getPotAmount.call(pollId)
      assert.equal(TokenValue.fromRaw(amount).value, 0, "total pot amount isn't correct")
    })
  })

  describe("when something has been deposited", async () => {
    beforeEach("Set up test", async () => {
      await token.approve(tokenPot.address, 15*10**18)
      await tokenPot.depositHere(pollId, 15*10**18)
      pollId = 1
    })

    afterEach('Teardown token pot', async () => {
      var tx = await tokenPot.resetTokenPot()
      // Utils.printLogs(tx.logs)
    })

    it("cannot withdraw more than total pot", async () => {
      let account = accounts[1]

      await ContractAssert.assertError(
        tokenPot.withdrawTo(pollId, account, 16*10**18),
        ContractAssert.errTypes('revert')
      )

      let amount = await tokenPot.getPotAmount.call(pollId)
      assert.equal(TokenValue.fromRaw(amount).value, 15, "total pot amount isn't correct")
    })

    it("cannot withdraw twice", async () => {
      let account = accounts[1]

      var tx = await tokenPot.withdrawTo(pollId, accounts[1], 12*10**18)
      await ContractAssert.assertError(
        tokenPot.withdrawTo(pollId, account, 12*10**18),
        ContractAssert.errTypes('revert')
      )

      let amount = await tokenPot.getPotAmount.call(pollId)
      assert.equal(TokenValue.fromRaw(amount).value, 15 - 12, "total pot amount isn't correct")
    })

    it("can withdraw tokens", async () => {
      let account = accounts[1]

      // for debugging
      // var claimed = await tokenPot.getClaimedAmount.call(account)
      // console.log(TokenValue.from(claimed).value)

      let oldBalance = TokenValue.from(await token.balanceOf.call(account)).value
      var tx = await tokenPot.withdrawTo(pollId, accounts[1], 12*10**18)

      let newBalance = TokenValue.from(await token.balanceOf.call(account)).value
      assert.equal(newBalance - oldBalance, 12*10**18, "wrong amount withdrawn")

      let amount = await tokenPot.getPotAmount.call(pollId)
      assert.equal(TokenValue.fromRaw(amount).value, 15 - 12, "total pot amount isn't correct")
    })
  })

  describe("when deposited and withdrawn", async () => {
    beforeEach("Set up test", async () => {
      let account = accounts[1]

      await token.approve(tokenPot.address, 15*10**18)
      await tokenPot.depositHere(pollId, 15*10**18)
      await tokenPot.withdrawTo(pollId, account, 12*10**18)
      pollId = 1
    })

    afterEach('Teardown token pot', async () => {
      var tx = await tokenPot.resetTokenPot()
      // Utils.printLogs(tx.logs)
    })

    it("cannot deposit again", async () => {
      await ContractAssert.assertError(
        tokenPot.depositHere(pollId, 5*10**18),
        ContractAssert.errTypes('revert')
      )
    })

  })

})