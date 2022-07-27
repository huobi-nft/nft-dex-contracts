/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("@openzeppelin/hardhat-upgrades");
require("solidity-coverage");

const { mnemonic, privateKey } = require("./secrets.json");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  // defaultNetwork: "mainnet",
  networks: {
    // localhost: {
    //   url: "http://127.0.0.1:8545",
    // },
    hardhat: {
      chainId: 1337,
      allowUnlimitedContractSize: true,
    },
    testnet: {
      url: "https://http-testnet.hecochain.com",
      chainId: 256,
      gas: 3000000,
      gasPrice: 2000000000, // 2Gwei
      // accounts: {mnemonic: mnemonic},
      accounts: [privateKey],
    },
    mainnet: {
      url: "https://http-mainnet.hecochain.com",
      chainId: 128,
      gas: 3000000,
      gasPrice: 2000000000, // 2Gwei
      // accounts: {mnemonic: mnemonic},
      accounts: [privateKey],
    },
    polygon: {
      url: "https://matic-mumbai.chainstacklabs.com",
      chainId: 80001,
      // gas: 3000000,
      // gasPrice: 2000000000, // 2Gwei
      // accounts: {mnemonic: mnemonic},
      accounts: [privateKey],
    },
  },
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: false,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 2000000,
  },
};
