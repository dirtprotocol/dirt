
const ERR_TYPES = {
    revert: "revert",
    outOfGas: "out of gas",
    invalidJump: "invalid JUMP",
    invalidOpcode: "invalid opcode",
    stackOverflow: "stack overflow",
    stackUnderflow: "stack underflow",
    staticStateChange : "static state change"
}

class ContractAssertions {

    constructor(utils) {
        this.utils = utils;
    }

    tokenEquals(actual, expected, message) {
        const result = actual.eq(expected);
        message = message ? (message + '. ') : ('');
        message = `${message}Expected ${this.utils.bigNumberToToken(actual)} to equal ${this.utils.bigNumberToToken(expected)}`;

        assert(result, message);
    }

    async asyncRejection(promise, search, message) {
        let error = null;

        if (!message) {
            message = search;
            search = null;
        }

        let res = null;
        try {
            res = await promise;
        } catch (e) {
            // Make sure we got an error
            // TODO: Validate error is of expected type (via msg)
            error = e;
        }

        message = message || 'Call expected to throw';

        assert(error != null, message + ' Returned: ' + (res ? JSON.stringify(res) : '<null>'));

        if (search) {
            if (!(search instanceof RegExp)) {
                search = new RegExp(search);
            }

            assert.match(error, search, message);
        }
    }

    callReverts(promise, message) {
        return this.asyncRejection(
            promise,
            /VM Exception while processing transaction: revert/i,
            message || 'Call raises a revert exception');
    }

    static errTypes(errtype) {
        return ERR_TYPES[errtype]
    }

    /* Assert an error happened
     * 
     * example:
     * Utils.assertError(publicVC.resolve(pollId), Utils.errTypes.revert);
     */
    static async assertError(asyncTestMethod, errType) {
        const PREFIX = "Error: VM Exception while processing transaction: "

        try {
            await asyncTestMethod
            throw null
        } catch (err) {
            assert(err, "Expected an error, but didn't get one")
            assert(
                err.toString().startsWith(PREFIX + errType),
                "Expected an error starting with '" +
                PREFIX + errType +
                "' but got '" + err.message + "' instead"
            )
        }

    }


}

module.exports = ContractAssertions;