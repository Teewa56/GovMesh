/*
 * ============================================================
 * hardhat.config.ts
 * ============================================================
 * Hardhat configuration for the GovMesh project.
 *
 * Networks:
 *   hardhat               — Local in-memory network for unit tests
 *   localhost             — Local hardhat node (pnpm hardhat node)
 *   polkadot-hub-testnet  — Polkadot Hub testnet (EVM-compatible)
 *   polkadot-hub-mainnet  — Polkadot Hub mainnet (production)
 *
 * Plugins:
 *   hardhat-toolbox       — ethers, chai, coverage, gas reporting
 *   hardhat-upgrades      — OpenZeppelin UUPS proxy deployment
 *   dotenv                — .env variable loading
 *
 * Solidity:
 *   0.8.28 with optimizer enabled (200 runs).
 *   evmVersion "cancun" for latest opcode support.
 *   viaIR enabled for better gas optimization.
 *
 * Gas Reporter:
 *   Enabled when REPORT_GAS=true in .env.
 *   Outputs gas usage per function call in test runs.
 *
 * Coverage:
 *   Run: pnpm hardhat coverage
 *   Output: coverage/ directory with HTML report.
 * ============================================================
 */

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";

dotenv.config();

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x" + "1".repeat(64);
const HUB_TESTNET_RPC = process.env.POLKADOT_HUB_RPC_URL || "https://rpc.polkadot-hub-testnet.io";
const HUB_MAINNET_RPC = process.env.POLKADOT_HUB_MAINNET_RPC_URL || "https://rpc.polkadot-hub.io";
const BLOCKSCOUT_URL = process.env.BLOCKSCOUT_URL || "https://blockscout.polkadot-hub.io";
const BLOCKSCOUT_API_KEY = process.env.BLOCKSCOUT_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
      viaIR: true,
    },
  },

  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: false,
    },

    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },

    "polkadot-hub-testnet": {
      url: HUB_TESTNET_RPC,
      chainId: 420420421,
      accounts: [DEPLOYER_KEY],
      gas: "auto",
      gasMultiplier: 1.3,
      timeout: 120_000,
    },

    "polkadot-hub-mainnet": {
      url: HUB_MAINNET_RPC,
      chainId: 420420420,
      accounts: [DEPLOYER_KEY],
      gas: "auto",
      gasMultiplier: 1.2,
      timeout: 120_000,
    },
  },

  etherscan: {
    apiKey: {
      "polkadot-hub-testnet": BLOCKSCOUT_API_KEY,
      "polkadot-hub-mainnet": BLOCKSCOUT_API_KEY,
    },
    customChains: [
      {
        network: "polkadot-hub-testnet",
        chainId: 420420421,
        urls: {
          apiURL: `${BLOCKSCOUT_URL}/api`,
          browserURL: BLOCKSCOUT_URL,
        },
      },
      {
        network: "polkadot-hub-mainnet",
        chainId: 420420420,
        urls: {
          apiURL: `${BLOCKSCOUT_URL}/api`,
          browserURL: BLOCKSCOUT_URL,
        },
      },
    ],
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
    coinmarketcap: process.env.CMC_API_KEY,
  },

  paths: {
    sources: "./core",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  mocha: {
    timeout: 120_000,
    reporter: "spec",
  },
};

export default config;