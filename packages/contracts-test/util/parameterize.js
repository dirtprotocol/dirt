
module.exports = {

    addressOfContract: function (parameters, class_name, key, contract) {
        return Promise.all(
            [
                contract.deployed(),
                parameters.deployed()
            ])
            .then(res => {
                // TODO: need to figure out where to log
                // console.log(`  Storing parameterized address: ${class_name}/${key} = ${res[0].address} @ Parameter Contract ${res[1].address}`)
                res[1].setAddress(class_name, key, res[0].address);
            });
    }
}