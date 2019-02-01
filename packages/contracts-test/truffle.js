module.exports = {
  networks: {
    local_ganache: {
      host: "ganache",
      port: 7545,
      gas: 6721975,
      network_id: "*", // Match any network id,
      is_local: true,
    },
    local: {
      host: "localhost",
      gas: 6721975,
      port: 9545,
      network_id: "*", // Match any network id
      is_local: true,
    },
    private_testnet: {
      host: '52.33.60.246',
      port: 40002,
      network_id: 270484,
      from: '0x4caF0836C913f67334aB4380b5962B9E217C8a0A',
      unlockPassword: 'testtest123'
    }
  },
  solc: {
    optimizer: {
      enabled: false,
      runs: 200
    }
  }
};
