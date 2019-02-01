const TestRegistrar = artifacts.require("TestRegistrar.sol")
const Utils = require('../util/contract-utils')
const Dirt = require('../util/dirt')
const TokenValue = require('@dirt/lib').TokenValue;

contract('Registrar', (accounts) => {

  var registry = null

  beforeEach('Setup registry', async () => {
    registry = await TestRegistrar.deployed()
    await registry._reset()
  })

  it("Adds items owned by the sender", async () => {
    await registry.addItem("A", "Hello World")
    let [owner, value, timestamp] = await registry.getItem.call("A")

    assert.equal(owner, accounts[0], `Owner of item is not caller`)
    assert.equal(value, "Hello World", `Value of item is not sent value`)
    assert(timestamp > 0, `Item timestamp not set`)
  })

  it("Rejects adding items that already exist", async () => {
    await registry.addItem("A", "Hello World");

    await Utils.assert.callReverts(
      registry.addItem("A", "Updated"),
      "Second call to addItem with same key fails"
    )

    const currentCount = await registry.getItemCount()
    assert.equal(currentCount.toNumber(), 1, "Item count isn't correct")
  })

  it("Allows owners to edit existing items that they own", async () => {
    await registry.addItem("A", "Hello World")
    await registry.editItem("A", "Updated value")
    let [owner, value, timestamp] = await registry.getItem.call("A")

    assert.equal(value, "Updated value", "Couldn't update value of item owned")
  })

  it("Rejects edits for non-owned items", async () => {
    await registry.addItem("A", "Hello World")

    await Utils.assert.callReverts(
      registry.editItem("A", "Updated value", { from: accounts[1] }),
      "Call reverts when editing non-owned items"
    )

    let [owner, value, timestamp] = await registry.getItem.call("A")

    assert.equal(owner, accounts[0], "Onwer of item is not caller")
    assert.equal(value, "Hello World", "Value of item is not sent value")
  })

  it("Checks if items exist by key", async () => {
    await registry.addItem("B", "Hello World")

    aExists = await registry.hasItem.call("A")
    assert(!aExists, "Item A should not exist")

    bExists = await registry.hasItem.call("B")
    assert(bExists, "Item B should exist")
  })

  it("Maintains correct item counts when adding items", async () => {
    for (let i = 0; i < 5; i++) {
      let currentCount = await registry.getItemCount()
      await registry.addItem(`A_${i}`, `Hello World`)
      let updatedCount = await registry.getItemCount()

      assert.equal(currentCount.toNumber(), i, "Item count not correct before adding")
      assert.equal(updatedCount.toNumber(), i + 1, "Item count not correct after adding")
    }
  })

  it("Allows deletes from owners of items", async () => {
    await registry.addItem("A", "Hello World")

    await registry.deleteItem("A")

    let exists = await registry.hasItem.call("A")
    let count = await registry.getItemCount.call()

    assert(!exists, "Item should no long exist")
    assert.equal(count, 0, "There should be no items left in index")

    await Utils.assert.callReverts(
      registry.getItem.call("A"),
      "Calling getItem on deleted item should fail"
    )
  })

  it("Rejects deletes from non-owners of items", async () => {
    await registry.addItem("A", "Hello World")

    await Utils.assert.callReverts(
      registry.deleteItem("A", { from: accounts[1] }),
      "Should not be able to delete item A"
    )
  })

  it("Correctly enumerates after deletions", async () => {
    let keys = ["A", "B", "C", "D", "E"]
    for (let i in keys) {
      let key = keys[i]
      await registry.addItem(key, "Hello World")
    }

    let currentCount = await registry.getItemCount()
    assert.equal(currentCount.toNumber(), 5, "Count after add incorrect")

    // Delete D, expect A, B, C, E to exist
    await registry.deleteItem("D")
    let newCount = await registry.getItemCount()
    assert.equal(newCount.toNumber(), 4, "Count after delete incorrect")

    let expectedKeys = { "A": false, "B": false, "C": false, "E": false }
    for (let key in expectedKeys) {
      let hasKey = await registry.hasItem.call(key)
      if (hasKey == true) {
        expectedKeys[key] = true
      }
    }

    for (let key in expectedKeys) {
      assert.equal(expectedKeys[key], true, `Item ${key} shouldn't exist`)
    }
  })


})
