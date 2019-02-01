const ContractAssert = require('./assert');
const BigNumber = web3.BigNumber;
const Dirt = require("./dirt");
const TokenValue = require('@dirt/lib').TokenValue;


class ContractUtils {

    constructor() {
        this.assert = new ContractAssert(this);
        this.addressZero = '0x0000000000000000000000000000000000000000';
    }

    randomName(prefix) {
        return (prefix || "") + Math.random().toString(36).substring(2);
    };

    getCurrentBlockTimestamp(web3) {
        return web3.eth.getBlock(web3.eth.blockNumber).timestamp;
    }

    waitEvent(contract, eventName, timeout) {
        timeout = timeout || 200;

        return new Promise((resolve, reject) => {

            const timeoutHandle = setTimeout(() => {
                reject(new Error(`Timeout after ${timeout}ms`));
            });

            const reject_ = (error) => {
                clearTimeout(timeoutHandle);
                reject(error);
            };

            var filter = { name: eventName };
            var event = contract[eventName]();
            event.watch();

            event.get((error, logs) => {
                if (error) return reject_(error);
                return resolve(logs[0]);
            });

            clearTimeout(timeoutHandle);
            event.stopWatching();
        });
    }

    async createAccountInstances(artifacts, web3, accounts, transfer, additional) {
        transfer = transfer || 0;

        let users = [];

        for (var i = 0; i < accounts.length; i++) {
            if (i > 0 && transfer) {
                await users[0].dirt.Token.transfer(accounts[i], TokenValue.from(500));
            }

            let instance = await Dirt(artifacts, web3, accounts[i]);;

            users[i] = {
                dirt: instance,
                address: accounts[i],
            };

            if (additional) {
                await additional(users[i], i);
            }
        }

        return users;
    }

    tokenToBigNumber(number) {
        var bigNumber = new BigNumber(number);
        bigNumber = bigNumber.times(new BigNumber(10).pow(18))
        return bigNumber;
    }

    bigNumberToToken(bigNumber) {
        bigNumber = bigNumber.div(new BigNumber(10).pow(18))
        return bigNumber.toNumber();
    }

    /* Debugging tool. Prints out the events emitted from a transaction obj.
     *
     * const Utils = require('../util/contract-utils')
     * let tx = await contract.someStateAlteringMethod()
     * Utils.printLogs(tx.logs)
     *
     */
    printLogs(logs) {
        for (let i in logs) {
            let evt = logs[i]
            this.printEvent(evt)
        }
    }

    /* Debugging tool. Prints out a logging event
     * 
     */
    printEvent(evt) {
        let numerifyObject = (object) => {
            for (let k in object) {
                if (object[k].toNumber) {
                    object[k] = object[k].div(new BigNumber(10).pow(18)).toNumber()
                }
            }
            return object
        }

        let presentableArgs = numerifyObject(evt.args)
        let eventstr = [evt.event]
        for (let k in presentableArgs) {
            eventstr.push(`${k}: ${presentableArgs[k].toString()}`)
        }
        console.log(eventstr.join(", "))
    }

    /* show logs of a contract. put in afterEach() in tests.
     * Note that if you have transactions in the setup, logs will only show for the last
     * external transaction call.
     * 
     * before('Setup all vote payout tests', async () => {
     *   votePayout = await artifacts.require("VotePayout.sol").deployed()  
     * })
     *
     * afterEach('after each test', async () => {
     *   Utils.showLogs(votePayout)
     * })
     * 
     */
    showLogs(contract) {
        let events = contract.allEvents()
        events.get((error, logs) => {
            if (error != null) {
                console.error(error)
                return
            }
            if (logs.length == 0) {
                console.log("no events in log")
            } else {
                this.printLogs(logs)
            }
        })
    }

}

module.exports = new ContractUtils();