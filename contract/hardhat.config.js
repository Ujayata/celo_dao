/** @type import('hardhat/config').HardhatUserConfig */
require('@nomicfoundation/hardhat-toolbox')
require('@nomicfoundation/hardhat-chai-matchers')
// require('@nomiclabs/hardhat-etherscan')
require('solidity-coverage')
require("hardhat-gas-reporter")
// require("hardhat-contract-sizer")
require('hardhat-deploy')
require('dotenv').config()

const CELO_RPC_URL = process.env.CELO
const ALFAJORES_RPC_URL = process.env.ALFAJORES_RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x"

// Your API key for Etherscan, obtain one at https://etherscan.io/
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "Your etherscan API keycv"
const REPORT_GAS = process.env.REPORT_GAS || false

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
        },
        localhost: {
            chainId: 31337,
        },
        alfajores: {
            url: ALFAJORES_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 44787
          },
        celo: {
        url: CELO_RPC_URL,
        accounts: [PRIVATE_KEY],
        chainId: 42220
        }
    },
    etherscan: {
        // npx hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
        apiKey: {
            sepolia: ETHERSCAN_API_KEY,
        },
    },
    gasReporter: {
        enabled: REPORT_GAS,
        currency: "USD",
        outputFile: "gas-report.txt",
        noColors: true,
        // coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    },
   
    namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
            1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
        },
       
    },
    solidity: {
        compilers: [
            {
                version: "0.8.19",
            },
        ],
    },
    mocha: {
        timeout: 200000, // 200 seconds max for running tests
    },
}

